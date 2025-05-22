import { Child, Screening, Tier, Referral, User } from '../types';
import { offlineDebug } from './offline-debug';

interface Conflict<T> {
  local: T;
  remote: T;
  type: 'create' | 'update' | 'delete';
  timestamp: number;
}

class ConflictResolver {
  private static instance: ConflictResolver;

  private constructor() {}

  static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  private async resolveChildConflict(conflict: Conflict<Child>): Promise<Child> {
    const { local, remote, type } = conflict;
    
    if (type === 'create') {
      // For create conflicts, keep the most recent version
      return local.timestamp > remote.timestamp ? local : remote;
    }

    if (type === 'update') {
      // For update conflicts, merge changes
      return {
        ...local,
        ...remote,
        lastModified: Math.max(local.lastModified, remote.lastModified),
        // Merge arrays and objects
        screenings: [...new Set([...(local.screenings || []), ...(remote.screenings || [])])],
        referrals: [...new Set([...(local.referrals || []), ...(remote.referrals || [])])],
      };
    }

    // For delete conflicts, keep the most recent action
    return local.timestamp > remote.timestamp ? local : remote;
  }

  private async resolveScreeningConflict(conflict: Conflict<Screening>): Promise<Screening> {
    const { local, remote, type } = conflict;
    
    if (type === 'create') {
      return local.timestamp > remote.timestamp ? local : remote;
    }

    if (type === 'update') {
      return {
        ...local,
        ...remote,
        lastModified: Math.max(local.lastModified, remote.lastModified),
        // Merge assessment data
        assessment: {
          ...local.assessment,
          ...remote.assessment,
          lastUpdated: Math.max(
            local.assessment?.lastUpdated || 0,
            remote.assessment?.lastUpdated || 0
          ),
        },
      };
    }

    return local.timestamp > remote.timestamp ? local : remote;
  }

  private async resolveTierConflict(conflict: Conflict<Tier>): Promise<Tier> {
    const { local, remote, type } = conflict;
    
    if (type === 'create') {
      return local.timestamp > remote.timestamp ? local : remote;
    }

    if (type === 'update') {
      return {
        ...local,
        ...remote,
        lastModified: Math.max(local.lastModified, remote.lastModified),
        // Merge tier-specific data
        criteria: {
          ...local.criteria,
          ...remote.criteria,
        },
      };
    }

    return local.timestamp > remote.timestamp ? local : remote;
  }

  private async resolveReferralConflict(conflict: Conflict<Referral>): Promise<Referral> {
    const { local, remote, type } = conflict;
    
    if (type === 'create') {
      return local.timestamp > remote.timestamp ? local : remote;
    }

    if (type === 'update') {
      return {
        ...local,
        ...remote,
        lastModified: Math.max(local.lastModified, remote.lastModified),
        // Merge referral-specific data
        status: local.status === 'completed' ? local.status : remote.status,
        notes: [...new Set([...(local.notes || []), ...(remote.notes || [])])],
      };
    }

    return local.timestamp > remote.timestamp ? local : remote;
  }

  private async resolveUserConflict(conflict: Conflict<User>): Promise<User> {
    const { local, remote, type } = conflict;
    
    if (type === 'create') {
      return local.timestamp > remote.timestamp ? local : remote;
    }

    if (type === 'update') {
      return {
        ...local,
        ...remote,
        lastModified: Math.max(local.lastModified, remote.lastModified),
        // Merge user preferences
        preferences: {
          ...local.preferences,
          ...remote.preferences,
        },
      };
    }

    return local.timestamp > remote.timestamp ? local : remote;
  }

  async resolveConflict<T extends Child | Screening | Tier | Referral | User>(
    conflict: Conflict<T>
  ): Promise<T> {
    try {
      offlineDebug.logInfo(
        `Resolving conflict for ${conflict.type} operation`,
        'conflict-resolver',
        { type: conflict.type, timestamp: conflict.timestamp }
      );

      let resolved: T;

      switch (true) {
        case 'childId' in conflict.local:
          resolved = await this.resolveChildConflict(conflict as Conflict<Child>) as T;
          break;
        case 'screeningId' in conflict.local:
          resolved = await this.resolveScreeningConflict(conflict as Conflict<Screening>) as T;
          break;
        case 'tierId' in conflict.local:
          resolved = await this.resolveTierConflict(conflict as Conflict<Tier>) as T;
          break;
        case 'referralId' in conflict.local:
          resolved = await this.resolveReferralConflict(conflict as Conflict<Referral>) as T;
          break;
        case 'userId' in conflict.local:
          resolved = await this.resolveUserConflict(conflict as Conflict<User>) as T;
          break;
        default:
          throw new Error('Unknown data type for conflict resolution');
      }

      offlineDebug.logInfo(
        'Conflict resolved successfully',
        'conflict-resolver',
        { type: conflict.type, timestamp: conflict.timestamp }
      );

      return resolved;
    } catch (error) {
      offlineDebug.logError(
        'Failed to resolve conflict',
        'conflict-resolver',
        { error, conflict }
      );
      throw error;
    }
  }
}

export const conflictResolver = ConflictResolver.getInstance(); 