import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="cart/index" />
        <Stack.Screen name="order/tracking" />
        <Stack.Screen name="explore" />
      </Stack>
    </>
  );
}
