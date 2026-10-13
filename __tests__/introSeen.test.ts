import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasSeenIntro, markIntroSeen } from '../src/features/intro';

describe('intro seen flag', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('is not set on first launch and is set after finishing', async () => {
    expect(await hasSeenIntro()).toBe(false);
    await markIntroSeen();
    expect(await hasSeenIntro()).toBe(true);
  });

  it('skips the intro when storage cannot be read', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('broken storage'));
    expect(await hasSeenIntro()).toBe(true);
  });

  it('does not throw when storage cannot be written', async () => {
    jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValueOnce(new Error('broken storage'));
    await expect(markIntroSeen()).resolves.toBeUndefined();
  });
});
