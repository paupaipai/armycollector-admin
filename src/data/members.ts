export type MemberKey = 'RM' | 'Jin' | 'Suga' | 'J-Hope' | 'Jimin' | 'V' | 'Jungkook' | 'BTS';

export const BTS_MEMBERS = [
  { member: 'RM', fullName: 'Kim Namjoon', emoji: '🐨', fileName: 'rm.png', codePart: 'RM', isGroup: false },
  { member: 'Jin', fullName: 'Kim Seokjin', emoji: '🐹', fileName: 'jin.png', codePart: 'JIN', isGroup: false },
  { member: 'Suga', fullName: 'Min Yoongi', emoji: '🐱', fileName: 'suga.png', codePart: 'SUGA', isGroup: false },
  { member: 'J-Hope', fullName: 'Jung Hoseok', emoji: '🐿️', fileName: 'jhope.png', codePart: 'JHOPE', isGroup: false },
  { member: 'Jimin', fullName: 'Park Jimin', emoji: '🐥', fileName: 'jimin.png', codePart: 'JIMIN', isGroup: false },
  { member: 'V', fullName: 'Kim Taehyung', emoji: '🐻', fileName: 'v.png', codePart: 'V', isGroup: false },
  { member: 'Jungkook', fullName: 'Jeon Jungkook', emoji: '🐰', fileName: 'jungkook.png', codePart: 'JUNGKOOK', isGroup: false },
] as const;

export const BTS_GROUP = { member: 'BTS', fullName: 'BTS', emoji: '💜', fileName: 'group.png', codePart: 'GROUP', isGroup: true } as const;

export const SET_TYPES = [
  { id: 'members', label: '7 miembros', includeGroup: false },
  { id: 'members_group', label: '7 miembros + group', includeGroup: true },
] as const;
