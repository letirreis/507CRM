import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contact, Activity } from '@/types';

const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';
const TEST_OWNER_ID = '22222222-2222-4222-8222-222222222222';
const TEST_ORG_ID = '33333333-3333-4333-8333-333333333333';
const TEST_DEAL_ID = '44444444-4444-4444-8444-444444444444';

const { mockState, supabaseMock } = vi.hoisted(() => {
  const TEST_USER_ID_HOISTED = '11111111-1111-4111-8111-111111111111';
  const TEST_ORG_ID_HOISTED = '33333333-3333-4333-8333-333333333333';
  const TEST_DEAL_ID_HOISTED = '44444444-4444-4444-8444-444444444444';
  const state = {
    userId: TEST_USER_ID_HOISTED,
    role: 'vendedor' as string,
    lastContactsInsert: null as Record<string, unknown> | null,
    lastActivitiesInsert: null as Record<string, unknown> | null,
  };

  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(async () => ({
      data: { role: state.role },
      error: null,
    })),
  };

  const contactsInsertSingle = vi.fn(async () => ({
    data: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      organization_id: TEST_ORG_ID_HOISTED,
      name: 'Contato Teste',
      email: 'contato@teste.com',
      phone: '+5511999999999',
      role: 'Comprador',
      company_name: null,
      client_company_id: null,
      avatar: null,
      notes: null,
      status: 'ACTIVE',
      stage: 'LEAD',
      source: null,
      birth_date: null,
      last_interaction: null,
      last_purchase_date: null,
      total_value: 0,
      custom_fields: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_id: state.lastContactsInsert?.owner_id ?? null,
    },
    error: null,
  }));

  const contactsBuilder = {
    insert: vi.fn((payload: Record<string, unknown>) => {
      state.lastContactsInsert = payload;
      return {
        select: vi.fn().mockReturnValue({
          single: contactsInsertSingle,
        }),
      };
    }),
  };

  const activitiesInsertSingle = vi.fn(async () => ({
    data: {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      organization_id: TEST_ORG_ID_HOISTED,
      title: 'Atividade Teste',
      description: null,
      type: 'TASK',
      date: new Date().toISOString(),
      completed: false,
      deal_id: TEST_DEAL_ID_HOISTED,
      contact_id: null,
      created_at: new Date().toISOString(),
      owner_id: state.lastActivitiesInsert?.owner_id ?? null,
    },
    error: null,
  }));

  const activitiesBuilder = {
    insert: vi.fn((payload: Record<string, unknown>) => {
      state.lastActivitiesInsert = payload;
      return {
        select: vi.fn().mockReturnValue({
          single: activitiesInsertSingle,
        }),
      };
    }),
  };

  const sb = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: state.userId ? { id: state.userId } : null },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') return profileBuilder;
      if (table === 'contacts') return contactsBuilder;
      if (table === 'activities') return activitiesBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    mockState: state,
    supabaseMock: sb,
    profileQueryBuilder: profileBuilder,
    contactsQueryBuilder: contactsBuilder,
    activitiesQueryBuilder: activitiesBuilder,
  };
});

vi.mock('@/lib/supabase/client', () => ({
  supabase: supabaseMock,
}));

import { contactsService } from '@/lib/supabase/contacts';
import { activitiesService } from '@/lib/supabase/activities';

beforeEach(() => {
  vi.clearAllMocks();
  mockState.userId = TEST_USER_ID;
  mockState.role = 'vendedor';
  mockState.lastContactsInsert = null;
  mockState.lastActivitiesInsert = null;
});

describe('owner assignment on create', () => {
  it('atribui owner_id automaticamente para contato quando usuário não é admin', async () => {
    const contact: Omit<Contact, 'id' | 'createdAt'> = {
      name: 'Contato Teste',
      email: 'contato@teste.com',
      phone: '+5511999999999',
      status: 'ACTIVE',
      stage: 'LEAD',
    };
    await contactsService.create(contact);

    expect(mockState.lastContactsInsert?.owner_id).toBe(TEST_USER_ID);
  });

  it('não atribui owner_id automaticamente para contato quando usuário é admin', async () => {
    mockState.role = 'admin';

    const contact: Omit<Contact, 'id' | 'createdAt'> = {
      name: 'Contato Admin',
      email: 'admin@teste.com',
      phone: '+5511888888888',
      status: 'ACTIVE',
      stage: 'LEAD',
    };
    await contactsService.create(contact);

    expect(mockState.lastContactsInsert?.owner_id).toBeNull();
  });

  it('preserva owner_id explícito em contato', async () => {
    mockState.role = 'admin';

    const contact: Omit<Contact, 'id' | 'createdAt'> = {
      name: 'Contato Reatribuído',
      email: 'owner@teste.com',
      phone: '+5511777777777',
      status: 'ACTIVE',
      stage: 'LEAD',
      ownerId: TEST_OWNER_ID,
    };
    await contactsService.create(contact);

    expect(mockState.lastContactsInsert?.owner_id).toBe(TEST_OWNER_ID);
  });

  it('não atribui owner_id automaticamente para atividade quando usuário é admin', async () => {
    mockState.role = 'admin';

    const activity: Omit<Activity, 'id' | 'createdAt'> = {
      dealId: TEST_DEAL_ID,
      dealTitle: 'Deal Teste',
      title: 'Atividade Admin',
      type: 'TASK',
      date: new Date().toISOString(),
      completed: false,
      user: { name: 'Admin', avatar: '' },
    };
    await activitiesService.create(activity);

    expect(mockState.lastActivitiesInsert?.owner_id).toBeUndefined();
  });

  it('atribui owner_id automaticamente para atividade quando usuário não é admin', async () => {
    const activity: Omit<Activity, 'id' | 'createdAt'> = {
      dealId: TEST_DEAL_ID,
      dealTitle: 'Deal Teste',
      title: 'Atividade Vendedor',
      type: 'TASK',
      date: new Date().toISOString(),
      completed: false,
      user: { name: 'Vendedor', avatar: '' },
    };
    await activitiesService.create(activity);

    expect(mockState.lastActivitiesInsert?.owner_id).toBe(TEST_USER_ID);
  });
});
