
import { Holiday } from '../types';

const HOLIDAYS_KEY = 'secur_corp_holidays';
const WEEKOFFS_KEY = 'secur_corp_weekoffs';

// Comprehensive database of standard public holidays for all 28 Indian states
const DEFAULT_HOLIDAYS_DATA: Record<string, Record<string, { name: string; date: string }[]>> = {
  "India": {
    "Andhra Pradesh": [{ name: "Sankranti", date: "2024-01-15" }, { name: "Ugadi", date: "2024-04-09" }],
    "Arunachal Pradesh": [{ name: "Losar", date: "2024-02-10" }],
    "Assam": [{ name: "Bihu", date: "2024-04-14" }],
    "Bihar": [{ name: "Chhath Puja", date: "2024-11-07" }],
    "Chhattisgarh": [{ name: "Hareli", date: "2024-08-04" }],
    "Goa": [{ name: "Goa Liberation Day", date: "2024-12-19" }],
    "Gujarat": [{ name: "Uttarayan", date: "2024-01-14" }],
    "Haryana": [{ name: "Haryana Day", date: "2024-11-01" }],
    "Himachal Pradesh": [{ name: "Himachal Day", date: "2024-04-15" }],
    "Jharkhand": [{ name: "Sarhul", date: "2024-04-11" }],
    "Karnataka": [
      { name: "Republic Day", date: "2024-01-26" },
      { name: "Ugadi", date: "2024-04-09" },
      { name: "Independence Day", date: "2024-08-15" },
      { name: "Gandhi Jayanti", date: "2024-10-02" },
      { name: "Rajyotsava", date: "2024-11-01" }
    ],
    "Kerala": [{ name: "Onam", date: "2024-09-15" }, { name: "Vishu", date: "2024-04-14" }],
    "Madhya Pradesh": [{ name: "MP Foundation Day", date: "2024-11-01" }],
    "Maharashtra": [
      { name: "Republic Day", date: "2024-01-26" },
      { name: "Gudi Padwa", date: "2024-04-09" },
      { name: "Maharashtra Day", date: "2024-05-01" },
      { name: "Ganesh Chaturthi", date: "2024-09-07" },
      { name: "Independence Day", date: "2024-08-15" }
    ],
    "Manipur": [{ name: "Sangai Festival", date: "2024-11-21" }],
    "Meghalaya": [{ name: "Wangala Festival", date: "2024-11-12" }],
    "Mizoram": [{ name: "Chapchar Kut", date: "2024-03-01" }],
    "Nagaland": [{ name: "Hornbill Festival", date: "2024-12-01" }],
    "Odisha": [{ name: "Raja Parba", date: "2024-06-14" }],
    "Punjab": [{ name: "Baisakhi", date: "2024-04-13" }],
    "Rajasthan": [{ name: "Rajasthan Day", date: "2024-03-30" }],
    "Sikkim": [{ name: "Losoong", date: "2024-12-31" }],
    "Tamil Nadu": [{ name: "Pongal", date: "2024-01-15" }],
    "Telangana": [{ name: "Bonalu", date: "2024-07-07" }],
    "Tripura": [{ name: "Kharchi Puja", date: "2024-07-14" }],
    "Uttar Pradesh": [{ name: "UP Day", date: "2024-01-24" }],
    "Uttarakhand": [{ name: "Phool Dei", date: "2024-03-14" }],
    "West Bengal": [{ name: "Durga Puja", date: "2024-10-10" }]
  },
  "USA": {
    "California": [
      { name: "New Year's Day", date: "2024-01-01" },
      { name: "MLK Day", date: "2024-01-15" },
      { name: "Independence Day", date: "2024-07-04" },
      { name: "Christmas", date: "2024-12-25" }
    ],
    "New York": [
      { name: "New Year's Day", date: "2024-01-01" },
      { name: "Independence Day", date: "2024-07-04" }
    ]
  },
  "UK": {
    "England": [{ name: "Good Friday", date: "2024-03-29" }]
  }
};

export const adminService = {
  getCountries: () => ["All Countries", ...Object.keys(DEFAULT_HOLIDAYS_DATA)],
  
  getStatesByCountry: (country: string) => {
    if (!country || country === "All Countries") return ["All States"];
    return ["All States", ...Object.keys(DEFAULT_HOLIDAYS_DATA[country] || {})];
  },

  getHolidays: (): Holiday[] => {
    const data = localStorage.getItem(HOLIDAYS_KEY);
    return data ? JSON.parse(data) : [];
  },

  addHoliday: (holiday: Holiday) => {
    const holidays = adminService.getHolidays();
    holidays.push(holiday);
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
  },

  removeHoliday: (id: string) => {
    const holidays = adminService.getHolidays().filter(h => h.id !== id);
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
  },

  getDefaultHolidaysForState: (country: string, state: string): Omit<Holiday, 'id'>[] => {
    if (!country || country === "All Countries" || !state || state === "All States") return [];
    const holidays = DEFAULT_HOLIDAYS_DATA[country]?.[state] || [];
    return holidays.map(h => ({
      ...h,
      country,
      state
    }));
  },

  getWeekOffs: (): number[] => {
    // Always return Sunday (0) and Saturday (6) as week offs for any country/state
    return [0, 6];
  },

  setWeekOffs: (days: number[]) => {
    localStorage.setItem(WEEKOFFS_KEY, JSON.stringify(days));
  }
};
