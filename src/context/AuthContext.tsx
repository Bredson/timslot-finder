"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth, db } from "../firebase/client";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface RequiredFields {
  name: boolean;
  email: boolean;
  phone: boolean;
  address: boolean;
  note: boolean;
}

interface WeeklyHours {
  enabled: boolean;
  start: string;
  end: string;
}

interface UserSettings {
  slotDuration: number;
  minAdvanceValue: number;
  minAdvanceUnit: "hours" | "days";
  requiredFields: RequiredFields;
  weeklyHours: {
    [key: string]: WeeklyHours;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  settings: UserSettings | null;
  refreshSettings: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  settings: null,
  refreshSettings: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const fetchUserSettings = async (userId: string) => {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data().settings as UserSettings);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania ustawień użytkownika:", error);
    }
  };

  const refreshSettings = async () => {
    if (user) {
      await fetchUserSettings(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserSettings(currentUser.uid);
      } else {
        setSettings(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setSettings(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, settings, refreshSettings, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Funkcja pomocnicza do tworzenia domyślnego profilu w Firestore dla nowego użytkownika
export async function initializeUserProfile(userId: string, email: string) {
  const defaultSettings: UserSettings = {
    slotDuration: 30, // 30 minut
    minAdvanceValue: 2,
    minAdvanceUnit: "days", // 2 dni
    requiredFields: {
      name: true,
      email: true,
      phone: true,
      address: false,
      note: false,
    },
    weeklyHours: {
      monday: { enabled: true, start: "09:00", end: "17:00" },
      tuesday: { enabled: true, start: "09:00", end: "17:00" },
      wednesday: { enabled: true, start: "09:00", end: "17:00" },
      thursday: { enabled: true, start: "09:00", end: "17:00" },
      friday: { enabled: true, start: "09:00", end: "17:00" },
      saturday: { enabled: false, start: "09:00", end: "17:00" },
      sunday: { enabled: false, start: "09:00", end: "17:00" },
    },
  };

  const userDocRef = doc(db, "users", userId);
  await setDoc(userDocRef, {
    email,
    createdAt: new Date().toISOString(),
    settings: defaultSettings,
  });
}
