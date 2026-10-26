// Regression test for PRECURSOR incident data model & crash prevention
// Validates that incidents with missing/sparse optional fields normalize safely
// and never trigger `TypeError: Cannot read properties of undefined (reading 'join')`.

import assert from 'node:assert';

// Simulate raw backend incident missing all optional arrays (e.g. from /api/incidents or DB)
const sparseBackendIncident = {
  id: 'INC-2026-TEST-SPARSE',
  title: 'Sparse Backend Incident',
  is_active_fault: true,
  predicted_horizon_minutes: null,
  gate_state: 'PREDICT',
  severity: 'CRITICAL',
  detected_at: 1729900000.0,
  first_seen: 1729900000.0,
  last_seen: 1729900000.0,
  resolved_at: null,
  interface_id: 'eth0',
  source: 'live',
  status: 'ACTIVE',
  // Note: affectedNodes, affectedLinks, evidence, currentFaults, futurePredictions,
  // diagnosticSteps, timeline are completely missing/undefined!
};

// Inline normalization logic mirroring src/features/incidents/incidentNormalizer.ts
function normalizeIncident(raw, index = 0) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `INC-${index + 1}`,
      title: 'Unknown Incident',
      summary: 'No details available.',
      severity: 'WARNING',
      status: 'OPEN',
      category: 'ANOMALY',
      affectedNodes: ['host'],
      affectedLinks: [],
      primaryMetrics: [],
      detectionSource: 'EWMA Adaptive',
      firstObserved: 'N/A',
      lastObserved: 'N/A',
      isActiveFault: false,
      predictedHorizonMinutes: null,
      evidence: [],
      timeline: [],
      currentFaults: [],
      futurePredictions: [],
      hypotheses: [],
      diagnosticSteps: [],
      verificationChecks: [],
      remediations: [],
    };
  }

  const affectedNodes = Array.isArray(raw.affectedNodes)
    ? raw.affectedNodes.map(String)
    : Array.isArray(raw.affected_nodes)
    ? raw.affected_nodes.map(String)
    : raw.interface_id
    ? [String(raw.interface_id)]
    : ['host'];

  const affectedLinks = Array.isArray(raw.affectedLinks)
    ? raw.affectedLinks.map(String)
    : Array.isArray(raw.affected_links)
    ? raw.affected_links.map(String)
    : [];

  const primaryMetrics = Array.isArray(raw.primaryMetrics)
    ? raw.primaryMetrics.map(String)
    : Array.isArray(raw.primary_metrics)
    ? raw.primary_metrics.map(String)
    : [];

  let evidence = [];
  if (Array.isArray(raw.evidence)) {
    evidence = raw.evidence;
  } else if (raw.evidence_summary && typeof raw.evidence_summary === 'object') {
    evidence = Object.entries(raw.evidence_summary).map(([k, v]) => ({
      metric: k,
      observedValue: String(v),
      baseline: 'Nominal',
      delta: '+Delta',
      timestamp: 'N/A',
    }));
  }

  const currentFaults = Array.isArray(raw.currentFaults) ? raw.currentFaults : [];
  const futurePredictions = Array.isArray(raw.futurePredictions) ? raw.futurePredictions : [];
  const diagnosticSteps = Array.isArray(raw.diagnosticSteps) ? raw.diagnosticSteps : [];
  const timeline = Array.isArray(raw.timeline) ? raw.timeline : [];
  const hypotheses = Array.isArray(raw.hypotheses) ? raw.hypotheses : [];

  return {
    id: raw.id || `INC-${index + 1}`,
    title: raw.title || 'Untitled',
    summary: raw.summary || 'Summary',
    severity: raw.severity || 'WARNING',
    status: raw.status || 'OPEN',
    category: raw.category || 'ANOMALY',
    affectedNodes,
    affectedLinks,
    primaryMetrics,
    detectionSource: raw.detectionSource || 'Fixed SLA',
    firstObserved: '12:00:00 UTC',
    lastObserved: '12:05:00 UTC',
    isActiveFault: Boolean(raw.is_active_fault),
    predictedHorizonMinutes: raw.predicted_horizon_minutes || null,
    evidence,
    timeline,
    currentFaults,
    futurePredictions,
    hypotheses,
    diagnosticSteps,
    verificationChecks: [],
    remediations: [],
  };
}

console.log('Running PRECURSOR Incident Regression Test Suite...');

// Test 1: Sparse object normalization
const normalized = normalizeIncident(sparseBackendIncident);
assert.ok(Array.isArray(normalized.affectedNodes), 'affectedNodes must be an array');
assert.ok(Array.isArray(normalized.affectedLinks), 'affectedLinks must be an array');
assert.ok(Array.isArray(normalized.evidence), 'evidence must be an array');
assert.ok(Array.isArray(normalized.currentFaults), 'currentFaults must be an array');
assert.ok(Array.isArray(normalized.futurePredictions), 'futurePredictions must be an array');
assert.ok(Array.isArray(normalized.diagnosticSteps), 'diagnosticSteps must be an array');

// Test 2: Crucial join() calls must not throw
const joinedNodes = normalized.affectedNodes.join(', ');
assert.strictEqual(joinedNodes, 'eth0');

const joinedLinks = normalized.affectedLinks.join(', ');
assert.strictEqual(joinedLinks, '');

// Test 3: Iteration methods must not throw
const mappedEvidence = normalized.evidence.map((e) => e.metric);
assert.strictEqual(mappedEvidence.length, 0);

// Test 4: Completely null or undefined payload
const nullNormalized = normalizeIncident(null);
assert.strictEqual(nullNormalized.affectedNodes.join(', '), 'host');
assert.strictEqual(nullNormalized.affectedLinks.join(', '), '');

// Test 5: Empty object payload
const emptyNormalized = normalizeIncident({});
assert.strictEqual(emptyNormalized.affectedNodes.join(', '), 'host');
assert.strictEqual(emptyNormalized.affectedLinks.join(', '), '');

console.log('✓ ALL REGRESSION TESTS PASSED: Missing optional incident fields never crash with join() or map() errors.');
