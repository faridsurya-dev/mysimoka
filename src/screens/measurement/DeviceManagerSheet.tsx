import React from 'react';
import { Modal } from 'react-native';
// Resolves to DeviceManagerScreen.web.tsx on web (no BLE there).
import { DeviceManagerScreen } from './DeviceManagerScreen';

type DeviceManagerSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Device screen as a full-screen modal on top of whatever the operator was
 * doing, so closing it (back button / Android back) returns to the exact same
 * place with any half-filled form intact. Render it inside another Modal's
 * tree when opened from a modal (required on iOS for stacked modals).
 */
export function DeviceManagerSheet({ visible, onClose }: DeviceManagerSheetProps) {
  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={onClose}>
      {visible ? <DeviceManagerScreen onBack={onClose} /> : null}
    </Modal>
  );
}
