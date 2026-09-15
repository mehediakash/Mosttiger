# 9Wicket Deployment Requirements

Configure these values only in the backend deployment environment:

```env
NINEWICKET_API_BASE_URL=
NINEWICKET_TOKEN=
NINEWICKET_SECRET=
NINEWICKET_CALLBACK_URL=https://<backend-host>/api/9wicket/callback
NINEWICKET_RETURN_URL=https://<frontend-host>/casino
NINEWICKET_CURRENCY=BDT
```

`NINEWICKET_API_BASE_URL` must be the account-specific API Base URL from the 9Wicket Client Panel Overview. It must not be the sportsbook play URL and must not include `/9w/play`.

The production server public IP must be whitelisted in the 9Wicket Client Panel before launch, inquiry, credit, or debit requests will work.

Never expose the token or 32-character secret to frontend/mobile/browser code.
