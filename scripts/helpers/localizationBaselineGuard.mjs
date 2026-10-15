// Read-only comparison. Existing English copy stays frozen; new keys are allowed.
export const compareEnglishBaseline = (baseline, current) => {
  const differences = [];
  for (const field of ['englishTranslations', 'reactionCases']) {
    for (const [key, value] of Object.entries(baseline[field] || {})) {
      if (!Object.hasOwn(current[field] || {}, key)) differences.push(`${field}: missing ${key}`);
      else if (current[field][key] !== value) differences.push(`${field}: changed ${key}`);
    }
    if (field === 'reactionCases') {
      for (const key of Object.keys(current[field] || {})) {
        if (!Object.hasOwn(baseline[field] || {}, key)) differences.push(`${field}: unbaselined scenario ${key}`);
      }
    }
  }
  for (const field of ['schemaVersion', 'bankShape', 'combinationEstimate', 'producers']) {
    if (JSON.stringify(baseline[field]) !== JSON.stringify(current[field])) differences.push(`${field}: changed`);
  }
  return differences;
};
