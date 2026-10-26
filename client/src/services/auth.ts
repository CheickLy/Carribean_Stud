export async function login(email: string, password: string) {
  const response = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }

  return data;
}


export async function register(
  username: string,
  email: string,
  password: string
) {
  const response = await fetch(
    'http://localhost:3001/api/auth/register',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  return data;
}


export async function startGuest() {
  const response = await fetch("http://localhost:3001/api/auth/guest", {
    method: "POST", credentials: "include"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Guest play failed");
  return data;
}

export async function getCurrentUser() {
  const response = await fetch("http://localhost:3001/api/auth/me", {
    credentials: "include"
  });
  if (response.status === 401) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load session");
  return data.user;
}

export async function logout() {
  const response = await fetch("http://localhost:3001/api/auth/logout", {
    method: "POST", credentials: "include"
  });
  if (!response.ok) throw new Error("Could not log out");
}
