import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Zap, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

interface FlashSaleSectionProps {
  onPressViewAll?: () => void;
}

export const FlashSaleSection: React.FC<FlashSaleSectionProps> = ({ onPressViewAll }) => {
  const [secondsLeft, setSecondsLeft] = useState(6320); // ~1 hr 45 min

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leftRow}>
          <View style={styles.zapCircle}>
            <Zap size={14} color="#FFF" fill="#FFF" />
          </View>
          <Text style={styles.title}>Kilat Murah Hari Ini</Text>
          
          {/* Countdown timer */}
          <View style={styles.timerRow}>
            <View style={styles.timerBox}><Text style={styles.timerText}>{hours}</Text></View>
            <Text style={styles.colon}>:</Text>
            <View style={styles.timerBox}><Text style={styles.timerText}>{minutes}</Text></View>
            <Text style={styles.colon}>:</Text>
            <View style={styles.timerBox}><Text style={styles.timerText}>{seconds}</Text></View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.viewAllBtn} 
          onPress={onPressViewAll}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>Lihat Semua</Text>
          <ChevronRight size={14} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zapCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.light.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  timerBox: {
    backgroundColor: '#FFE5E8',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  timerText: {
    color: Colors.light.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  colon: {
    color: Colors.light.danger,
    fontSize: 10,
    fontWeight: '700',
    marginHorizontal: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
});
