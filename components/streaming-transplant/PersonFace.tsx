/**
 * #179 (plan §22): a person's face, the NPC database's own seeded portrait, the same one wherever they appear (the
 * table, their page, the CVs, the memos, the minutes, the cap table, the term sheets). A firm has no face: it keeps
 * its initials. The portrait is drawn once per person and cached by the avatar service.
 */
import React, { useMemo } from 'react';
import type { Gender } from '../../types';
import { getGenderedAvatar } from '../../services/npcAvatar';
import { getCanonicalProfileAvatar } from '../../services/profileAvatar';
import css from './presentation/screens/Boardroom/PersonFace.module.css';
import { cx } from './presentation/cx';

export const initialsOf = (name: string) => name.split(/\s+/).map(word => word[0] || '').join('').slice(0, 2).toUpperCase();

export const PersonFace: React.FC<{
    name: string;
    /** a person's gender draws their portrait; without one (a firm), the initials show */
    gender?: Gender | null;
    /** a stored picture (the founder's own) wins over the drawn one */
    src?: string | null;
    className?: string;
}> = ({ name, gender, src, className }) => {
    const face = useMemo(() => (src ? getCanonicalProfileAvatar(src, gender || undefined, name) : gender ? getGenderedAvatar(gender, name) : null), [src, gender, name]);
    if (!face) return <span className={cx(css.initials, className)}>{initialsOf(name)}</span>;
    return <img className={cx(css.face, className)} src={face} alt="" draggable={false} />;
};

export default PersonFace;
