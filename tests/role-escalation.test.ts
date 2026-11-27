import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DecodedIdToken } from 'firebase-admin/auth';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  createExpressApp,
  getTrustedRole,
  isBootstrappedAdmin,
  type AdminUserRecord,
} from '../server.ts';
import { resolveTrustedRoleFromToken } from '../src/App.tsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function makeDecodedToken(overrides: Partial<DecodedIdToken> = {}): DecodedIdToken {
  return {
    aud: 'campusos-839f7',
    auth_time: 1_700_000_000,
    exp: 1_900_000_000,
    firebase: { identities: {}, sign_in_provider: 'google.com' },
    iat: 1_700_000_000,
    iss: 'https://securetoken.google.com/campusos-839f7',
    sub: 'uid-default',
    uid: 'uid-default',
    email: 'student@bspi.edu.bd',
    email_verified: true,
    ...overrides,
  } as DecodedIdToken;
}

async function withServer(
  app: ReturnType<typeof createExpressApp>,
  fn: (baseUrl: string) => Promise<void>,
) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address();
  assert(addr && typeof addr === 'object', 'Expected ephemeral TCP address');
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

test('firestore.rules rejects self-service role escalation and enforces custom claims', () => {
  const rules = fs.readFileSync(path.join(ROOT_DIR, 'firestore.rules'), 'utf-8');

  // Must NOT trust Firestore profile document role for authorization
  assert.equal(/\bcallerRole\s*\(/.test(rules), false);
  assert.equal(/\bhasProfile\s*\(/.test(rules), false);
  assert.equal(/profiles\/\$\(request\.auth\.uid\)/.test(rules), false);

  // Must verify trusted Firebase Auth custom claims + bootstrapped verified admin
  assert.match(rules, /function hasTrustedRoleClaim\(roleName\)/);
  assert.match(rules, /'role' in request\.auth\.token/);
  assert.match(rules, /request\.auth\.token\.role == roleName/);
  assert.match(rules, /function isAdmin\(\) \{\s*return isTokenAdmin\(\) \|\| hasTrustedRoleClaim\('admin'\);/);
  assert.match(rules, /function isTeacher\(\) \{\s*return hasTrustedRoleClaim\('teacher'\);/);

  // Public profile creation must strictly enforce role == 'student'
  assert.match(
    rules,
    /match \/profiles\/\{profileId\}[\s\S]*allow create:[\s\S]*incoming\(\)\.uid == request\.auth\.uid[\s\S]*incoming\(\)\.role == 'student'/,
  );

  // Profile update must block self-role changes for both owners and admins
  assert.match(
    rules,
    /allow update:[\s\S]*!\(isOwner\(profileId\) && incoming\(\)\.role != existing\(\)\.role\)[\s\S]*isOwner\(profileId\)[\s\S]*incoming\(\)\.role == existing\(\)\.role/,
  );
  assert.match(
    rules,
    /affectedKeys\(\)\.hasOnly\(\[\s*'full_name',\s*'department',\s*'shift',\s*'semester',\s*'bookmarked_notices'\s*\]\)/,
  );
});

test('frontend signup and onboarding lock role to student and ignore tampered Firestore roles', () => {
  const authSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/AuthScreen.tsx'),
    'utf-8',
  );
  const appSource = fs.readFileSync(path.join(ROOT_DIR, 'src/App.tsx'), 'utf-8');

  // Signup form must not expose privileged role selection and must write role: 'student'
  assert.equal(/ROLE_OPTIONS/.test(authSource), false);
  assert.match(authSource, /role:\s*'student'/);

  // Google onboarding form must not expose role selection and must write role: 'student'
  assert.equal(/onboard-role/.test(appSource), false);
  assert.equal(/onboardRole/.test(appSource), false);
  assert.match(appSource, /role:\s*'student'/);
  assert.match(appSource, /role:\s*trustedRole/);

  // Token resolution unit checks
  assert.equal(
    resolveTrustedRoleFromToken(
      { email: 'student@bspi.edu.bd', emailVerified: true },
      {},
    ),
    'student',
  );
  assert.equal(
    resolveTrustedRoleFromToken(
      { email: 'teacher@bspi.edu.bd', emailVerified: true },
      { role: 'teacher' },
    ),
    'teacher',
  );
  assert.equal(
    resolveTrustedRoleFromToken(
      { email: 'admin2@bspi.edu.bd', emailVerified: true },
      { role: 'admin' },
    ),
    'admin',
  );
  assert.equal(
    resolveTrustedRoleFromToken(
      { email: BOOTSTRAPPED_ADMIN_EMAIL, emailVerified: true },
      {},
    ),
    'admin',
  );
  assert.equal(
    resolveTrustedRoleFromToken(
      { email: BOOTSTRAPPED_ADMIN_EMAIL, emailVerified: false },
      {},
    ),
    'student',
  );
});

test('backend getTrustedRole trusts only verified token claims and verified bootstrapped admin', () => {
  assert.equal(getTrustedRole(makeDecodedToken({ uid: 's1' })), 'student');
  assert.equal(
    getTrustedRole(makeDecodedToken({ uid: 't1', role: 'teacher' })),
    'teacher',
  );
  assert.equal(
    getTrustedRole(makeDecodedToken({ uid: 'a1', role: 'admin' })),
    'admin',
  );
  assert.equal(
    getTrustedRole(
      makeDecodedToken({
        uid: 'boot-admin',
        email: BOOTSTRAPPED_ADMIN_EMAIL,
        email_verified: true,
      }),
    ),
    'admin',
  );
  assert.equal(
    isBootstrappedAdmin(
      makeDecodedToken({
        uid: 'unverified-boot',
        email: BOOTSTRAPPED_ADMIN_EMAIL,
        email_verified: false,
      }),
    ),
    false,
  );
  assert.equal(
    getTrustedRole(
      makeDecodedToken({
        uid: 'unverified-boot',
        email: BOOTSTRAPPED_ADMIN_EMAIL,
        email_verified: false,
      }),
    ),
    'student',
  );
});

test('backend /api/admin/set-role blocks students, teachers, self-escalation, and bootstrapped admin demotion', async () => {
  const users = new Map<string, AdminUserRecord>([
    [
      'student-1',
      { uid: 'student-1', email: 'student1@bspi.edu.bd', emailVerified: true, customClaims: {} },
    ],
    [
      'teacher-1',
      {
        uid: 'teacher-1',
        email: 'teacher1@bspi.edu.bd',
        emailVerified: true,
        customClaims: { role: 'teacher', departmentCode: 'CST' },
      },
    ],
    [
      'admin-claim-1',
      {
        uid: 'admin-claim-1',
        email: 'admin2@bspi.edu.bd',
        emailVerified: true,
        customClaims: { role: 'admin' },
      },
    ],
    [
      'boot-admin-1',
      {
        uid: 'boot-admin-1',
        email: BOOTSTRAPPED_ADMIN_EMAIL,
        emailVerified: true,
        customClaims: {},
      },
    ],
  ]);

  const syncedProfiles = new Map<string, string>();
  const tokenMap = new Map<string, DecodedIdToken>([
    [
      'token-student',
      makeDecodedToken({ uid: 'student-1', email: 'student1@bspi.edu.bd' }),
    ],
    [
      'token-teacher',
      makeDecodedToken({
        uid: 'teacher-1',
        email: 'teacher1@bspi.edu.bd',
        role: 'teacher',
      }),
    ],
    [
      'token-admin-claim',
      makeDecodedToken({
        uid: 'admin-claim-1',
        email: 'admin2@bspi.edu.bd',
        role: 'admin',
      }),
    ],
    [
      'token-boot-admin',
      makeDecodedToken({
        uid: 'boot-admin-1',
        email: BOOTSTRAPPED_ADMIN_EMAIL,
        email_verified: true,
      }),
    ],
    [
      'token-unverified-boot',
      makeDecodedToken({
        uid: 'fake-boot',
        email: BOOTSTRAPPED_ADMIN_EMAIL,
        email_verified: false,
      }),
    ],
  ]);

  const app = createExpressApp({
    verifyIdToken: async (token) => {
      const decoded = tokenMap.get(token);
      if (!decoded) throw new Error('Invalid token');
      return decoded;
    },
    getUser: async (uid) => {
      const found = users.get(uid);
      if (!found) {
        const err = new Error('User not found') as Error & { code?: string };
        err.code = 'auth/user-not-found';
        throw err;
      }
      return found;
    },
    getUserByEmail: async (email) => {
      const found = Array.from(users.values()).find(
        (u) => (u.email || '').toLowerCase() === email.toLowerCase(),
      );
      if (!found) {
        const err = new Error('User not found') as Error & { code?: string };
        err.code = 'auth/user-not-found';
        throw err;
      }
      return found;
    },
    setCustomUserClaims: async (uid, claims) => {
      const existing = users.get(uid);
      if (!existing) throw new Error('Missing user');
      existing.customClaims = claims ?? undefined;
    },
    syncProfileRole: async (uid, role) => {
      syncedProfiles.set(uid, role);
      return true;
    },
  });

  await withServer(app, async (baseUrl) => {
    // 1. Unauthenticated caller is rejected with 401
    const unauthRes = await fetch(`${baseUrl}/api/admin/set-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: 'student-1', role: 'admin' }),
    });
    assert.equal(unauthRes.status, 401);

    // 2. Student cannot self-promote or promote others even with spoofed payload fields
    const studentRes = await fetch(`${baseUrl}/api/admin/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-student',
      },
      body: JSON.stringify({
        uid: 'student-1',
        role: 'admin',
        context: { profile: { role: 'admin' } },
      }),
    });
    assert.equal(studentRes.status, 403);
    assert.deepEqual(users.get('student-1')?.customClaims, {});

    // 3. Teacher cannot promote anyone or become admin
    const teacherRes = await fetch(`${baseUrl}/api/admin/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-teacher',
      },
      body: JSON.stringify({ uid: 'teacher-1', role: 'admin' }),
    });
    assert.equal(teacherRes.status, 403);
    assert.equal(users.get('teacher-1')?.customClaims?.role, 'teacher');

    // 4. Unverified email matching bootstrapped admin is rejected
    const unverifiedRes = await fetch(`${baseUrl}/api/admin/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-unverified-boot',
      },
      body: JSON.stringify({ uid: 'student-1', role: 'teacher' }),
    });
    assert.equal(unverifiedRes.status, 403);

    // 5. Admin cannot modify their own role
    const selfAdminRes = await fetch(`${baseUrl}/api/admin/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-admin-claim',
      },
      body: JSON.stringify({ uid: 'admin-claim-1', role: 'student' }),
    });
    assert.equal(selfAdminRes.status, 403);

    // 6. Admin cannot demote bootstrapped admin
    const demoteBootRes = await fetch(`${baseUrl}/api/admin/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-admin-claim',
      },
      body: JSON.stringify({ email: BOOTSTRAPPED_ADMIN_EMAIL, role: 'student' }),
    });
    assert.equal(demoteBootRes.status, 403);

    // 7. Invalid role value rejected with 400
    const badRoleRes = await fetch(`${baseUrl}/api/admin/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-boot-admin',
      },
      body: JSON.stringify({ uid: 'student-1', role: 'superadmin' }),
    });
    assert.equal(badRoleRes.status, 400);

    // 8. Bootstrapped admin can promote student -> teacher and preserves existing claims on teacher
    const promoteRes = await fetch(`${baseUrl}/api/admin/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-boot-admin',
      },
      body: JSON.stringify({ email: 'teacher1@bspi.edu.bd', role: 'admin' }),
    });
    assert.equal(promoteRes.status, 200);
    const promoteBody = (await promoteRes.json()) as {
      uid: string;
      role: string;
      profileSynced: boolean;
    };
    assert.equal(promoteBody.uid, 'teacher-1');
    assert.equal(promoteBody.role, 'admin');
    assert.equal(promoteBody.profileSynced, true);
    assert.deepEqual(users.get('teacher-1')?.customClaims, {
      departmentCode: 'CST',
      role: 'admin',
    });
    assert.equal(syncedProfiles.get('teacher-1'), 'admin');

    // 9. Admin custom claim also authorizes backend resource moderation (lost-found delete)
    const createLostRes = await fetch(`${baseUrl}/api/lost-found`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-student',
      },
      body: JSON.stringify({
        type: 'lost',
        title: 'ID Card',
        description: 'Dropped near Academic Building',
        location: 'Academic Building',
      }),
    });
    assert.equal(createLostRes.status, 201);
    const createdLost = (await createLostRes.json()) as { item: { id: string } };

    // Another non-owner (teacher) cannot delete student's lost-found report
    const teacherDeleteRes = await fetch(
      `${baseUrl}/api/lost-found/${createdLost.item.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-teacher' },
      },
    );
    assert.equal(teacherDeleteRes.status, 403);

    // Claim-based admin CAN delete student's lost-found report
    const adminDeleteRes = await fetch(
      `${baseUrl}/api/lost-found/${createdLost.item.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-admin-claim' },
      },
    );
    assert.equal(adminDeleteRes.status, 200);
  });
});
