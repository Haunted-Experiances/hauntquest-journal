import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, Zap, Eye, Mic, Radio } from 'lucide-react-native';

function TabIcon({ Icon, color, focused }: { Icon: React.ComponentType<{ size: number; color: string }>; color: string; focused: boolean }) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: focused ? 'rgba(180, 120, 30, 0.18)' : 'transparent',
      }}
    >
      <Icon size={22} color={color} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0005',
          borderTopColor: '#2a1030',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#c8882a',
        tabBarInactiveTintColor: '#6b4f7a',
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hauntings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Home} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="poltergeist"
        options={{
          title: 'Poltergeist',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Zap} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="sightings"
        options={{
          title: 'Sightings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Eye} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="evp"
        options={{
          title: 'EVP',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Mic} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="emf"
        options={{
          title: 'EMF',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Radio} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
