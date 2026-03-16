import { describe, expect, it } from 'vitest';

import { getMockSiteNavigation } from '@/mocks/data/siteNavigation';
import type { SiteNavigationItem } from '@/types/siteNavigation';

const findNavigationItem = (
  items: SiteNavigationItem[],
  label: string,
): SiteNavigationItem | undefined => {
  return items.find((item) => item.label === label);
};

const getMaxDepth = (items: SiteNavigationItem[], depth = 1): number => {
  return items.reduce((maxDepth, item) => {
    if (!item.children?.length) {
      return Math.max(maxDepth, depth);
    }

    return Math.max(maxDepth, getMaxDepth(item.children, depth + 1));
  }, depth);
};

describe('getMockSiteNavigation', () => {
  it('matches the doctor, general, and online course groupings to the current reference structure', () => {
    const navigation = getMockSiteNavigation('sono-school-main').items;

    const doctorCourses = findNavigationItem(navigation, '의사과정');
    const generalCourses = findNavigationItem(navigation, '일반과정');
    const onlineCourses = findNavigationItem(navigation, '온라인과정');

    expect(doctorCourses?.children?.map((item) => item.label)).toEqual([
      '내과과정',
      '심장과정',
      '소아과정',
      '소아심장과정',
      'MSK 스캔집중과정',
      '응급/POCUS과정',
      '복부 동영상 + Hands-on 실습 패키지',
      '두경부 동영상 + Hands-on 실습 패키지',
      '갑상선·경부 진단 워크숍',
      '유방초음파 임상판독 워크숍',
      '혈관접근·DVT Bedside 워크숍',
      '여성골반초음파 진료 적용 과정',
      '태아심장초음파 입문 워크숍',
    ]);

    expect(generalCourses?.children?.map((item) => item.label)).toEqual([
      '복부과정',
      '심장과정',
      '두경부 동영상 + Hands-on 실습 패키지',
      '두경부과정',
      '근골격과정',
      '여성초음파과정',
      '유방과정',
      '응급/POCUS과정',
    ]);

    expect(onlineCourses?.children?.map((item) => item.label)).toEqual([
      '이론+스캔',
      'ARDMS 시험 대비',
      'POCUS 라이브러리',
      '여성초음파 이론',
      'SPI 시험 대비 (재학생 특강)',
    ]);
  });

  it('builds hub URLs for header-exposed 교육과정 items without exposing /detail children', () => {
    const navigation = getMockSiteNavigation('sono-school-main').items;
    const doctorCourses = findNavigationItem(navigation, '의사과정');
    const generalCourses = findNavigationItem(navigation, '일반과정');
    const abdomenCourse = findNavigationItem(generalCourses?.children ?? [], '복부과정');
    const doctorPocusCourse = findNavigationItem(doctorCourses?.children ?? [], '응급/POCUS과정');
    const pocusCourse = findNavigationItem(generalCourses?.children ?? [], '응급/POCUS과정');
    const internalMedicineCourse = findNavigationItem(doctorCourses?.children ?? [], '내과과정');
    const abdomenBasicCourse = findNavigationItem(
      abdomenCourse?.children ?? [],
      '복부 Basic 스캔 6주',
    );
    const doctorFastCourse = findNavigationItem(doctorPocusCourse?.children ?? [], 'FAST 집중과정');
    const fastCourse = findNavigationItem(pocusCourse?.children ?? [], 'FAST Basic 4주');

    expect(doctorCourses?.to).toBe('/programs/doctor-course');
    expect(internalMedicineCourse?.to).toBe('/programs/doctor-course/internal-medicine');
    expect(internalMedicineCourse?.children).toBeUndefined();
    expect(doctorPocusCourse?.to).toBe('/programs/doctor-course/pocus');
    expect(doctorFastCourse?.to).toBe('/programs/doctor-course/pocus/fast');
    expect(doctorFastCourse?.children).toBeUndefined();
    expect(abdomenCourse?.to).toBe('/programs/general-course/abdomen');
    expect(abdomenBasicCourse?.to).toBe('/programs/general-course/abdomen/abdomen-basic-6-weeks');
    expect(abdomenBasicCourse?.children).toBeUndefined();
    expect(pocusCourse?.to).toBe('/programs/general-course/pocus');
    expect(fastCourse?.to).toBe('/programs/general-course/pocus/fast-basic-4-weeks');
    expect(fastCourse?.children).toBeUndefined();
  });

  it('does not place faculty introduction items under online courses and stays within 3 depths', () => {
    const navigation = getMockSiteNavigation('sono-school-main').items;
    const onlineCourses = findNavigationItem(navigation, '온라인과정');

    const onlineChildLabels = onlineCourses?.children?.map((item) => item.label) ?? [];

    expect(onlineChildLabels).not.toContain('전임 강사진');
    expect(onlineChildLabels).not.toContain('초빙 강사진');
    expect(getMaxDepth(navigation)).toBeLessThanOrEqual(3);
  });
});
