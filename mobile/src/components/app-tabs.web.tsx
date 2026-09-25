import React from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Home, LayoutGrid } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs style={styles.container}>
      {/* Main Content Area */}
      <TabSlot style={styles.contentSlot} />

      {/* Clean Bottom Navigation Bar (No Expo Starter!) */}
      <TabList style={styles.bottomNav}>
        <TabTrigger name="home" href="/" asChild>
          <BottomTabButton label="Beranda">
            {(isFocused) => (
              <Home
                size={22}
                color={isFocused ? Colors.light.primary : Colors.light.textMuted}
                strokeWidth={isFocused ? 2.5 : 1.8}
              />
            )}
          </BottomTabButton>
        </TabTrigger>

        <TabTrigger name="explore" href="/explore" asChild>
          <BottomTabButton label="Kategori">
            {(isFocused) => (
              <LayoutGrid
                size={22}
                color={isFocused ? Colors.light.primary : Colors.light.textMuted}
                strokeWidth={isFocused ? 2.5 : 1.8}
              />
            )}
          </BottomTabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

interface BottomTabButtonProps extends Omit<TabTriggerSlotProps, 'children'> {
  label: string;
  children: (isFocused: boolean) => React.ReactNode;
}

function BottomTabButton({ label, children, isFocused, ...props }: BottomTabButtonProps) {
  return (
    <Pressable {...props} style={styles.tabBtn}>
      <View style={styles.iconContainer}>
        {children(!!isFocused)}
      </View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: isFocused ? Colors.light.primary : Colors.light.textMuted,
            fontWeight: isFocused ? '700' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    position: 'relative',
    backgroundColor: '#F8F9FF',
  },
  contentSlot: {
    flex: 1,
    height: '100%',
  },
  bottomNav: {
    position: 'fixed' as any,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxWidth: 480,
    marginHorizontal: 'auto' as any,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    zIndex: 99,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    cursor: 'pointer' as any,
  },
  iconContainer: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
  },
});
