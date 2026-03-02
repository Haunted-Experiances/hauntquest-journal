import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession } from '@/lib/auth/use-session';
import * as Haptics from 'expo-haptics';

export default function VerifyOTPScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const invalidateSession = useInvalidateSession();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleVerify = async (code: string) => {
    if (code.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signIn.emailOtp({
        email: email ?? '',
        otp: code,
      });
      if (result.error) {
        setError(result.error.message ?? 'Invalid code. Please try again.');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setOtp('');
        return;
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Invalidate session — Stack.Protected handles redirect to main app
      await invalidateSession();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeOtp = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(digits);
    setError(null);
    if (digits.length === 6) {
      handleVerify(digits);
    }
  };

  // Focus the input on mount
  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Emblem */}
          <View style={styles.emblemWrap}>
            <Text style={styles.emblemEmoji}>🔮</Text>
            <View style={styles.emblemRing} />
          </View>

          <Text style={styles.title}>VERIFY CODE</Text>
          <View style={styles.titleDivider} />

          {email ? (
            <Text style={styles.subtitle}>
              Code sent to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          ) : null}

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>6-DIGIT CODE</Text>

            <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpDisplayRow}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    otp.length === i && styles.otpBoxActive,
                    otp.length > i && styles.otpBoxFilled,
                    error ? styles.otpBoxError : null,
                  ]}
                >
                  <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                </View>
              ))}
            </Pressable>

            {/* Hidden TextInput that drives the OTP display */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={handleChangeOtp}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.hiddenInput}
              caretHidden
              testID="otp-input"
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingRow}>
                <Text style={styles.loadingText}>VERIFYING...</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.verifyBtn, (loading || otp.length !== 6) && styles.verifyBtnDisabled]}
              onPress={() => handleVerify(otp)}
              disabled={loading || otp.length !== 6}
              testID="verify-button"
            >
              <Text style={styles.verifyBtnText}>
                {loading ? 'VERIFYING...' : 'CONFIRM'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.backBtn}
              onPress={() => router.back()}
              testID="back-button"
            >
              <Text style={styles.backBtnText}>← Back to email</Text>
            </Pressable>
          </View>

          <Text style={styles.footerOrnament}>— ✦ —</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0d0500',
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },

  // Emblem
  emblemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  emblemEmoji: {
    fontSize: 60,
    textShadowColor: 'rgba(200,146,42,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  emblemRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: 'rgba(200,146,42,0.22)',
  },

  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f5e6c8',
    letterSpacing: 5,
    textAlign: 'center',
    marginBottom: 10,
  },
  titleDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#8b3a00',
    borderRadius: 1,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 13,
    color: '#9a7c4e',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  emailText: {
    color: '#c8922a',
    fontWeight: '700',
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: 'rgba(30,14,2,0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,58,0,0.4)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8b3a00',
    letterSpacing: 2.5,
    marginBottom: 14,
    textAlign: 'center',
  },

  // OTP boxes
  otpDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  otpBox: {
    width: 42,
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(139,58,0,0.35)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: '#c8922a',
    backgroundColor: 'rgba(200,146,42,0.08)',
  },
  otpBoxFilled: {
    borderColor: 'rgba(139,58,0,0.6)',
    backgroundColor: 'rgba(139,58,0,0.12)',
  },
  otpBoxError: {
    borderColor: 'rgba(180,0,0,0.6)',
    backgroundColor: 'rgba(139,0,0,0.08)',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f5e6c8',
  },

  // Hidden input
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(139,0,0,0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#e07070',
    lineHeight: 17,
    textAlign: 'center',
  },

  loadingRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8b3a00',
    letterSpacing: 3,
  },

  // Button
  verifyBtn: {
    backgroundColor: '#8b3a00',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#8b3a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  verifyBtnDisabled: {
    backgroundColor: '#4a2000',
    shadowOpacity: 0,
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#f5e6c8',
    letterSpacing: 3,
  },

  // Back
  backBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 12,
    color: '#6b4a1e',
    fontStyle: 'italic',
  },

  footerOrnament: {
    fontSize: 14,
    color: 'rgba(139,58,0,0.4)',
    marginTop: 32,
    letterSpacing: 6,
  },
});
