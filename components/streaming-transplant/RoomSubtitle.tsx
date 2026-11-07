/*
 * #219 (plan §24): the small line under a room's title. While someone else runs the company, it says who, in gold, in
 * place of the room's own words. Zeesh (2026-11-04): "ऊपर में पॉपअप आ रहा है, रेफर सिल्वा रन नौ स्टार यो चेयर द बोर्ड, वो काफ़ी
 * अजीब सा दिख रहा है".
 */
import React, { createContext, useContext } from 'react';

/** the wrapper's word: "RAFAEL RUNS THIS · YOU CHAIR", or null while you run it yourself */
export const ChairSubtitleContext = createContext<string | null>(null);

export const RoomSubtitle = ({ children }: { children: string }) => {
    const chair = useContext(ChairSubtitleContext);
    return chair ? <span style={{ color: '#f6d78f' }}>{chair}</span> : <span>{children}</span>;
};
