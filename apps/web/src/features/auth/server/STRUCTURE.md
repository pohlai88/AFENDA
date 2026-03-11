# Auth Feature Structure

Target layout for `apps/web` auth:

```
apps/web/
  auth.ts
  proxy.ts

  src/
    app/
      api/
        auth/
          [...nextauth]/
            route.ts

      auth/
        _actions/
          signin.ts
          signout.ts
          verify.ts
          invite.ts
          reset-password.ts
          forgot-password.ts

        _components/
          auth-card.tsx
          auth-footer.tsx
          auth-form-message.tsx
          auth-header.tsx
          auth-page-shell.tsx
          auth-submit-button.tsx
          portal-switcher.tsx
          portal-switcher-list.tsx

        _lib/
          auth-copy.ts
          auth-errors.ts
          auth-redirect.ts
          auth-schemas.ts
          auth-state.ts
          portal-registry.ts
          portal-routing.ts

        signin/
          page.tsx

        verify/
          page.tsx

        invite/
          page.tsx

        reset-password/
          page.tsx

        portal/
          [portal]/
            signin/
              page.tsx

    features/
      auth/
        server/
          afenda-auth.types.ts
          afenda-auth.service.ts
          afenda-auth.mock.ts
          afenda-auth.http.ts
          auth-options.ts
          auth-session.ts
          auth-user.mapper.ts
          auth-errors.ts

          mfa/
            mfa.types.ts
            mfa.service.ts

          tokens/
            auth-token.types.ts
            auth-token.service.ts

          audit/
            audit.types.ts
            audit.service.ts
            audit.helpers.ts
```
