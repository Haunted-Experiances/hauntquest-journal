import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { authClient } from '@/lib/auth/auth-client';
import * as Haptics from 'expo-haptics';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: trimmed,
        type: 'sign-in',
      });
      if (result.error) {
        setError(result.error.message ?? 'Failed to send code. Try again.');
        return;
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.push({ pathname: '/verify-otp' as any, params: { email: trimmed } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.emblemEmoji}>👻</Text>
            <View style={styles.emblemRing} />
          </View>

          {/* Title */}
          <Text style={styles.title}>GHOST INVESTIGATOR</Text>
          <View style={styles.titleDivider} />
          <Text style={styles.subtitle}>
            Sign in to share your discoveries{'\n'}with investigators worldwide
          </Text>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={[styles.inputBox, error ? styles.inputBoxError : null]}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                placeholder="your@email.com"
                placeholderTextColor="#6b4a1e"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={handleSendCode}
                testID="email-input"
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
              onPress={handleSendCode}
              disabled={loading}
              testID="send-code-button"
            >
              <Text style={styles.sendBtnText}>
                {loading ? 'SENDING...' : 'SEND CODE'}
              </Text>
            </Pressable>

            <Text style={styles.hint}>
              We'll send a 6-digit code to your email.{'\n'}No password needed.
            </Text>
          </View>

          {/* Footer ornament */}
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
    fontSize: 64,
    textShadowColor: 'rgba(200,146,42,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  emblemRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(200,146,42,0.25)',
  },

  // Title
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
    fontStyle: 'italic',
    marginBottom: 36,
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
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139,58,0,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
  },
  inputBoxError: {
    borderColor: 'rgba(180,0,0,0.6)',
  },
  inputIcon: {
    fontSize: 16,
    color: '#8b3a00',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#f5e6c8',
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
  },

  // Button
  sendBtn: {
    backgroundColor: '#8b3a00',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#8b3a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: '#4a2000',
    shadowOpacity: 0,
  },
  sendBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#f5e6c8',
    letterSpacing: 3,
  },

  // Hint
  hint: {
    fontSize: 11,
    color: '#6b4a1e',
    textAlign: 'center',
    lineHeight: 17,
  },

  // Footer
  footerOrnament: {
    fontSize: 14,
    color: 'rgba(139,58,0,0.4)',
    marginTop: 32,
    letterSpacing: 6,
  },
});
