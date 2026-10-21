import { bmiForAgeZ, nutritionStatus } from '../src/features/growth/nutritionStatus';

// Laki-laki, lahir 2020-01-01, diukur 2025-02-01 = 5 th 1 bln (61 bulan).
// Permenkes 2/2020 Tabel 15: -3 SD 12.1, -2 SD 13.0, median 15.3, +1 SD 16.6, +2 SD 18.3.
const boy = { gender: 'male', dateOfBirth: '2020-01-01' };
const at = '2025-02-01';

describe('nutritionStatus (IMT/U WHO 2007, Permenkes 2/2020)', () => {
  it('matches the Permenkes table points', () => {
    expect(bmiForAgeZ(15.3, 'male', 61)).toBeCloseTo(0, 1);
    expect(bmiForAgeZ(18.3, 'male', 61)).toBeCloseTo(2, 1);
    expect(bmiForAgeZ(13.0, 'male', 61)).toBeCloseTo(-2, 1);
  });

  it('categorises a 5-year-old boy', () => {
    expect(nutritionStatus(12.0, boy, at)).toBe('Gizi buruk');
    expect(nutritionStatus(12.5, boy, at)).toBe('Gizi kurang');
    expect(nutritionStatus(15.3, boy, at)).toBe('Gizi baik');
    expect(nutritionStatus(17.0, boy, at)).toBe('Gizi lebih');
    expect(nutritionStatus(19.0, boy, at)).toBe('Obesitas');
  });

  it('differs between boys and girls of the same age and BMI', () => {
    const girl = { gender: 'P', dateOfBirth: '2014-01-01' };
    const sameAgeBoy = { gender: 'L', dateOfBirth: '2014-01-01' };
    const z = (g: string) => bmiForAgeZ(20, g, 132);
    expect(z('female')).not.toBeCloseTo(z('male') ?? 0, 2);
    expect(nutritionStatus(20, girl, '2025-01-01')).not.toBeNull();
    expect(nutritionStatus(20, sameAgeBoy, '2025-01-01')).not.toBeNull();
  });

  it('does not guess without sex or birth date, or under 5 years', () => {
    expect(nutritionStatus(15, { gender: null, dateOfBirth: '2020-01-01' }, at)).toBeNull();
    expect(nutritionStatus(15, { gender: 'male', dateOfBirth: null }, at)).toBeNull();
    expect(nutritionStatus(15, { gender: 'male', dateOfBirth: '2022-01-01' }, at)).toBeNull();
  });

  it('uses Kemenkes adult cut-offs above 19 years', () => {
    const adult = { gender: 'female', dateOfBirth: '1990-01-01' };
    expect(nutritionStatus(16.5, adult, at)).toBe('Gizi buruk');
    expect(nutritionStatus(18.0, adult, at)).toBe('Gizi kurang');
    expect(nutritionStatus(22, adult, at)).toBe('Gizi baik');
    expect(nutritionStatus(26, adult, at)).toBe('Gizi lebih');
    expect(nutritionStatus(28, adult, at)).toBe('Obesitas');
  });
});
