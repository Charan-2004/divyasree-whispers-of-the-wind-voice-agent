import { describe, it, expect } from 'vitest';
import { 
  createInitialState, 
  extractDimensionsFromText, 
  getNextCheckpoint, 
  calculateLeadClassification,
  QualificationState 
} from '../server/stateMachine.js';

describe('State Machine & Deterministic Qualification', () => {
  it('should initialize with clean default state', () => {
    const state = createInitialState();
    expect(state.permission).toBeNull();
    expect(state.intent).toBeNull();
    expect(state.location_fit).toBeNull();
    expect(state.budget_fit).toBeNull();
    expect(state.timeline_fit).toBeNull();
    expect(state.lead_classification).toBe('WARM');
    expect(state.current_checkpoint).toBe('PERMISSION');
  });

  it('should extract early multi-dimensional information without re-asking', () => {
    const utterance = "I'm looking for a weekend home near Nandi Hills and my budget is around 1.5 Cr.";
    const extracted = extractDimensionsFromText(utterance);

    expect(extracted.intent).toBe('self_use');
    expect(extracted.location_fit).toBe('fit');
    expect(extracted.budget_fit).toBe('fit');

    const state: QualificationState = {
      ...createInitialState(),
      permission: 'granted',
      ...extracted
    };

    // Since intent, geography, and budget are known, next checkpoint must jump directly to TIMELINE
    const next = getNextCheckpoint(state);
    expect(next).toBe('TIMELINE');
  });

  it('should detect investment intent correctly', () => {
    const utterance = "I want a high yield land investment with good capital appreciation in North Bangalore.";
    const extracted = extractDimensionsFromText(utterance);

    expect(extracted.intent).toBe('investment');
    expect(extracted.location_fit).toBe('fit');
  });

  it('should handle budget mismatch gracefully', () => {
    const utterance = "My maximum budget is only 40 to 50 lakhs.";
    const extracted = extractDimensionsFromText(utterance);

    expect(extracted.budget_fit).toBe('below_budget');

    const state: QualificationState = {
      ...createInitialState(),
      permission: 'granted',
      intent: 'self_use',
      location_fit: 'fit',
      budget_fit: 'below_budget',
      timeline_fit: 'fit'
    };

    const result = calculateLeadClassification(state);
    expect(result.classification).toBe('COLD');
    expect(result.summary).toContain('Budget mismatch');
  });

  it('should handle location mismatch correctly without pushing', () => {
    const utterance = "Nandi Hills is too far, I strictly want Whitefield only.";
    const extracted = extractDimensionsFromText(utterance);

    expect(extracted.location_fit).toBe('not_fit');

    const state: QualificationState = {
      ...createInitialState(),
      permission: 'granted',
      intent: 'self_use',
      location_fit: 'not_fit',
      budget_fit: 'fit',
      timeline_fit: 'fit'
    };

    const result = calculateLeadClassification(state);
    expect(result.classification).toBe('COLD');
    expect(result.summary).toContain('Location mismatch');
  });

  it('should handle irritated user immediately with DO_NOT_CONTACT', () => {
    const utterance = "Please stop calling me! Remove my number.";
    const extracted = extractDimensionsFromText(utterance);

    expect(extracted.permission).toBe('denied');
    expect(extracted.lead_temperature).toBe('do_not_contact');
    expect(extracted.lead_classification).toBe('DO_NOT_CONTACT');
    expect(extracted.conversation_complete).toBe(true);
  });

  it('should handle busy / in-a-meeting with CALLBACK', () => {
    const utterance = "I am in a client meeting right now, please call later.";
    const extracted = extractDimensionsFromText(utterance);

    expect(extracted.permission).toBe('callback_requested');
    expect(extracted.lead_classification).toBe('CALLBACK');
    expect(extracted.conversation_complete).toBe(true);
  });

  it('should qualify a complete HOT lead accurately', () => {
    const state: QualificationState = {
      ...createInitialState(),
      permission: 'granted',
      intent: 'self_use',
      location_fit: 'fit',
      budget_fit: 'fit',
      timeline_fit: 'fit',
      handoff_requested: true,
      conversation_complete: true
    };

    const result = calculateLeadClassification(state);
    expect(result.classification).toBe('HOT');
    expect(result.temperature).toBe('hot');
  });
});
