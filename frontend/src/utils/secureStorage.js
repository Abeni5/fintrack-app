// ─────────────────────────────────────────────────────────────────────────────
// secureStorage.js
// Place at: src/utils/secureStorage.js
//
// Wraps expo-secure-store with the same get/set/remove API as AsyncStorage
// so we can swap it in everywhere with minimal changes.
//
// Install: npx expo install expo-secure-store
// ─────────────────────────────────────────────────────────────────────────────

import * as SecureStore from 'expo-secure-store';

// SecureStore keys cannot contain certain characters — keep keys simple
const TOKEN_KEY = 'fintrack_token';
const USER_KEY = 'fintrack_user';

export async function setToken(token) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (e) {
    console.log('SecureStore setToken error:', e);
  }
}

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    console.log('SecureStore getToken error:', e);
    return null;
  }
}

export async function removeToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) {
    console.log('SecureStore removeToken error:', e);
  }
}

export async function setUser(user) {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.log('SecureStore setUser error:', e);
  }
}

export async function getUser() {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.log('SecureStore getUser error:', e);
    return null;
  }
}

export async function removeUser() {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (e) {
    console.log('SecureStore removeUser error:', e);
  }
}

export async function clearAuth() {
  await removeToken();
  await removeUser();
}