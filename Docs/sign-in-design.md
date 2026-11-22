# Sign in and sign out design

I used Jakob's law for this flow: people are used to finding Log in and Register in the top right of a website and expect a familiar email and password form. The homepage puts those buttons in the top right. Log in and Register open separate dialogs over the dimmed page. The form has a clear main action, with Forgot password and the other account option nearby. Guest play stays separate so it is clear that it does not save an account.

After signing in, a player goes to the play page and an administrator goes to the dashboard. Log out is visible in both places. It ends the server session and returns the user to the homepage. If the request fails, the page shows an error rather than pretending the user signed out.

I would check this flow with a keyboard, a narrow screen, a wrong password, guest play, and a refresh after logging out.

Protected pages now wait until the session has been checked for the current route. This prevents a newly created guest from being redirected to login using the previous Tables page's anonymous session state. A failed session check shows an error; a confirmed anonymous session still redirects to login, and admin pages still validate the fresh role. Regression tests cover direct guest joining, a delayed session response, a failed check and stale admin state.
