export type GroupCode = 'dks' | 'dkp1' | 'dkp2';

export const GROUPS: { code: GroupCode; name: string; emoji: string; text: string }[] = [
  { code: 'dks', name: 'ДКС', emoji: '🍂', text: 'Архив игр группы ДКС' },
  { code: 'dkp1', name: 'ДКП-1', emoji: '🍁', text: 'Архив игр группы ДКП-1' },
  { code: 'dkp2', name: 'ДКП-2', emoji: '🎃', text: 'Архив игр группы ДКП-2' },
];

export const groupName = (code: string) => GROUPS.find((g) => g.code === code)?.name ?? code;

export interface Question {
  price: number;
  text: string;
  answer: string;
}

export interface Category {
  name: string;
  questions: Question[];
}

export interface Board {
  categories: Category[];
}

export interface GameRow {
  id: string;
  group_code: GroupCode;
  title: string;
  author: string;
  board: Board;
  created_at: string;
}
