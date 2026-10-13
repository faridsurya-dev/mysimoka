import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { IntroScreen } from '../src/screens/auth/intro/IntroScreen';

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

function textOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => node.props.children as string);
}

describe('IntroScreen', () => {
  it('pages through four distinct slides and finishes with Mulai', async () => {
    const onFinish = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <IntroScreen onFinish={onFinish} />
        </SafeAreaProvider>,
      );
    });

    const titles = [
      'Temukan siswa dengan cepat',
      'Catat tinggi dan berat',
      'Status gizi tiap kelas',
      'Riwayat tumbuh tetap tersimpan',
    ];
    const texts = textOf(renderer);
    titles.forEach(title => expect(texts).toContain(title));

    const pressNext = async () => {
      const button = renderer.root.findByProps({ testID: 'intro-next' });
      await ReactTestRenderer.act(() => {
        button.props.onPress();
      });
    };

    expect(textOf(renderer)).toContain('Lanjut');
    expect(textOf(renderer)).toContain('Lewati');
    await pressNext();
    await pressNext();
    await pressNext();
    expect(textOf(renderer)).toContain('Mulai');
    expect(textOf(renderer)).not.toContain('Lewati');
    expect(onFinish).not.toHaveBeenCalled();
    await pressNext();
    expect(onFinish).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });
});
