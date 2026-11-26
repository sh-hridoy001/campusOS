# CampusOS (BSPI Kaptai) Firestore Security Specification

## 1. Data Invariants
1. Every document in `profiles/{profileId}` must have `uid == request.auth.uid == profileId`, a valid role in `['student', 'teacher', 'admin']`, bounded strings, optional valid `shift` (`1st Shift`/`2nd Shift`), optional valid `semester` (`1st Semester`–`8th Semester`), optional bounded `bookmarked_notices` string list (`<= 100`), and server-validated `created_at == request.time`.
2. Users cannot escalate their own `role` or change `uid`/`created_at` after profile creation; owners may only update `full_name`, `department`, `shift`, `semester`, and `bookmarked_notices`.
3. PII (`email`) in `profiles` is restricted to the profile owner or verified administrators (`get`), and list queries require `resource.data.uid == request.auth.uid` or verified admin token claim.
4. Only `teacher` or `admin` profiles (or the bootstrapped admin email with `email_verified == true`) may create, update, or delete `notices` and `routines`.
5. `notices` supports optional validated `category` (`Academic`, `Exam`, `Admission`, `Stipend/Upobritti`, `General`) and boolean `is_urgent`; `routines` supports optional validated `shift` and `semester`.
6. Every document creation and update enforces exact allowed/required keys (`hasAll` / `hasOnly`), string `.size()` bounds, regex-checked IDs, and immutable `created_by` / `created_at`.

## 2. Adversarial Payloads ("Dirty Dozen")
1. Unauthenticated read on `/profiles/{uid}` -> `PERMISSION_DENIED`
2. Unauthenticated list on `/notices` -> `PERMISSION_DENIED`
3. Profile creation with spoofed `uid` (`uid != request.auth.uid`) -> `PERMISSION_DENIED`
4. Profile creation with ghost field (`isSuperAdmin: true`) -> `PERMISSION_DENIED`
5. Profile creation with client-forged `created_at` timestamp (`!= request.time`) -> `PERMISSION_DENIED`
6. Student updating their own `role` from `'student'` to `'admin'` -> `PERMISSION_DENIED`
7. Non-owner reading another user's `/profiles/{otherUid}` (PII leak) -> `PERMISSION_DENIED`
8. Profile update injecting >100 items or non-string element in `bookmarked_notices` -> `PERMISSION_DENIED`
9. Student attempting to create a notice in `/notices/{id}` with invalid `category` -> `PERMISSION_DENIED`
10. Teacher attempting to delete another teacher's notice -> `PERMISSION_DENIED`
11. Student attempting to create or delete a class slot in `/routines/{id}` -> `PERMISSION_DENIED`
12. Oversized `content` string (> 10,000 chars) or invalid `shift` (`3rd Shift`) -> `PERMISSION_DENIED`
