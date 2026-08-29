import type {
    StreamingAssistedNetworkPriority,
    StreamingAssistedRiskTolerance,
    StreamingInfrastructureManagementMode,
    StreamingInfrastructureManagementPolicy,
} from '../types';

export const DEFAULT_STREAMING_MANAGEMENT_POLICY: StreamingInfrastructureManagementPolicy = {
    mode: 'ASSISTED',
    priority: 'BALANCED',
    maximumBudget: 10_000_000,
    riskTolerance: 'MEDIUM',
    preferredCityIds: [],
    requireApprovalForExpensiveChanges: true,
    approvalThreshold: 2_000_000,
};

const oneOf = <T extends string>(value: unknown, values: readonly T[], fallback: T): T => (
    typeof value === 'string' && values.includes(value as T) ? value as T : fallback
);

const finiteBetween = (value: unknown, minimum: number, maximum: number, fallback: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.round(Math.max(minimum, Math.min(maximum, parsed)));
};

export const normalizeStreamingInfrastructureManagementPolicy = (
    value: unknown,
): StreamingInfrastructureManagementPolicy => {
    const source = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Partial<StreamingInfrastructureManagementPolicy>
        : {};
    const cityIds = Array.isArray(source.preferredCityIds)
        ? source.preferredCityIds
            .filter((id): id is string => typeof id === 'string')
            .map(id => id.trim().toUpperCase())
            .filter(Boolean)
        : [];
    return {
        mode: oneOf<StreamingInfrastructureManagementMode>(
            source.mode,
            ['ASSISTED', 'HANDS_ON'],
            DEFAULT_STREAMING_MANAGEMENT_POLICY.mode,
        ),
        priority: oneOf<StreamingAssistedNetworkPriority>(
            source.priority,
            ['ECONOMY', 'BALANCED', 'RELIABLE', 'PREMIUM'],
            DEFAULT_STREAMING_MANAGEMENT_POLICY.priority,
        ),
        maximumBudget: finiteBetween(
            source.maximumBudget,
            1_000_000,
            500_000_000,
            DEFAULT_STREAMING_MANAGEMENT_POLICY.maximumBudget,
        ),
        riskTolerance: oneOf<StreamingAssistedRiskTolerance>(
            source.riskTolerance,
            ['LOW', 'MEDIUM', 'HIGH'],
            DEFAULT_STREAMING_MANAGEMENT_POLICY.riskTolerance,
        ),
        preferredCityIds: Array.from(new Set(cityIds)).slice(0, 4),
        requireApprovalForExpensiveChanges: source.requireApprovalForExpensiveChanges !== false,
        approvalThreshold: finiteBetween(
            source.approvalThreshold,
            250_000,
            50_000_000,
            DEFAULT_STREAMING_MANAGEMENT_POLICY.approvalThreshold,
        ),
    };
};
