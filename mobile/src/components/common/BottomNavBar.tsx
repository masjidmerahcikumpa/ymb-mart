import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, LayoutGrid, ClipboardList, User } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

interface BottomNavBarProps {
  activeTab?: 'home' | 'categories' | 'orders' | 'profile';
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab = 'home' }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {/* 1. Beranda */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => router.push('/')}
          activeOpacity={0.7}
        >
          <Home
            size={22}
            color={activeTab === 'home' ? Colors.light.primary : Colors.light.textMuted}
            strokeWidth={activeTab === 'home' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'home' ? Colors.light.primary : Colors.light.textMuted },
              activeTab === 'home' && styles.tabLabelActive,
            ]}
          >
            Beranda
          </Text>
        </TouchableOpacity>

        {/* 2. Kategori */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => router.push('/explore')}
          activeOpacity={0.7}
        >
          <LayoutGrid
            size={22}
            color={activeTab === 'categories' ? Colors.light.primary : Colors.light.textMuted}
            strokeWidth={activeTab === 'categories' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'categories' ? Colors.light.primary : Colors.light.textMuted },
              activeTab === 'categories' && styles.tabLabelActive,
            ]}
          >
            Kategori
          </Text>
        </TouchableOpacity>

        {/* 3. Riwayat */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => router.push('/order/tracking' as any)}
          activeOpacity={0.7}
        >
          <ClipboardList
            size={22}
            color={activeTab === 'orders' ? Colors.light.primary : Colors.light.textMuted}
            strokeWidth={activeTab === 'orders' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'orders' ? Colors.light.primary : Colors.light.textMuted },
              activeTab === 'orders' && styles.tabLabelActive,
            ]}
          >
            Riwayat
          </Text>
        </TouchableOpacity>

        {/* 4. Akun */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => alert('Akun & Poin YMB Gold')}
          activeOpacity={0.7}
        >
          <User
            size={22}
            color={activeTab === 'profile' ? Colors.light.primary : Colors.light.textMuted}
            strokeWidth={activeTab === 'profile' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'profile' ? Colors.light.primary : Colors.light.textMuted },
              activeTab === 'profile' && styles.tabLabelActive,
            ]}
          >
            Akun
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    alignItems: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  navBar: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '800',
  },
});
