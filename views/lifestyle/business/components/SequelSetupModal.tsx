import React, { useState } from 'react';
import { Player, Business, PastProject, Writer } from '../../../../types';
import { formatMoney } from '../../../../services/formatUtils';
import { X, PenTool, DollarSign, Users, TrendingUp } from 'lucide-react';
import { generateWriters } from '../../../../src/data/generators';


interface SequelSetupModalProps {
    project: PastProject;
    player: Player;
    studio: Business;
    onClose: () => void;
    onStartWriting: (writer: Writer | null, title: string, isSpinoff: boolean) => void;
    isSpinoff?: boolean;
}

export const SequelSetupModal: React.FC<SequelSetupModalProps> = ({ project, player, studio, onClose, onStartWriting, isSpinoff }) => {
    const nextInstallment = (project.installmentNumber || 1) + 1;
    const baseName = project.name.replace(/\s\d+$/, ''); // Remove trailing number if exists
    const [title, setTitle] = useState(isSpinoff ? `${baseName}: A Spin-off Story` : `${baseName} ${nextInstallment}`);
    const [selectedWriter, setSelectedWriter] = useState<Writer | null>(null);
    const [useOriginalWriter, setUseOriginalWriter] = useState(true);
    const [step, setStep] = useState<'SETUP' | 'CONFIRM'>('SETUP');

    const originalWriterId = project.projectDetails?.hiddenStats?.scriptQuality ? 'writer_original' : null; 
    const previousSalary = Math.floor(project.budget * 0.05);
    const newSalary = Math.floor(previousSalary * 1.5); // 50% bump

    const originalWriter: Writer | null = originalWriterId ? {
        id: originalWriterId,
        name: 'Original Creator',
        skill: project.projectDetails?.hiddenStats?.scriptQuality || 50,
        fee: newSalary,
        speed: 5,
        tier: 'COMMON',
        stats: { creativity: 50, dialogue: 50, structure: 50, pacing: 50 }
    } : null;

    const availableWriters = studio.studioState?.writers?.length ? studio.studioState.writers : generateWriters(3);

    const handleStart = () => {
        const writerToUse = useOriginalWriter ? originalWriter : selectedWriter;
        onStartWriting(writerToUse, title, !!isSpinoff);
    };

    if (step === 'CONFIRM') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden flex flex-col items-center text-center p-8 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/50">
                        <PenTool className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Script in Development!</h2>
                    <p className="text-zinc-400 mb-8">
                        Your writer has started working on <strong>{title}</strong>. 
                        You can track its progress in the <strong>Development Lab</strong>. 
                        Once the script is finished, you can greenlight the project and negotiate with returning talent!
                    </p>
                    <button 
                        onClick={handleStart}
                        className="w-full py-3 rounded-xl font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white transition-all hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                    >
                        Go to Development Lab
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <PenTool className="w-6 h-6 text-blue-400" />
                            {isSpinoff ? 'Commission Spin-off' : 'Commission Sequel'}
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">Based on "{project.name}"</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-zinc-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Working Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-400" />
                            Writer Selection
                        </h3>
                        
                        {originalWriter && (
                            <div 
                                onClick={() => setUseOriginalWriter(true)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${useOriginalWriter ? 'bg-blue-500/10 border-blue-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-semibold text-white flex items-center gap-2">
                                            {originalWriter.name}
                                            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">Original Creator</span>
                                        </div>
                                        <div className="text-sm text-zinc-400 mt-1">Skill: {originalWriter.skill}/100</div>
                                        <div className="text-xs text-zinc-500 mt-1">Previous Salary: {formatMoney(previousSalary)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-red-400 font-medium flex items-center justify-end gap-1">
                                            {formatMoney(originalWriter.fee)}
                                        </div>
                                        <div className="text-xs text-red-400/80 flex items-center justify-end gap-1 mt-1">
                                            <TrendingUp className="w-3 h-3" /> +50% Demand
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-zinc-800">
                            <h4 className="text-sm font-medium text-zinc-400 mb-3">Or Hire New Writer</h4>
                            <div className="space-y-3">
                                {availableWriters.map(writer => (
                                    <div 
                                        key={writer.id}
                                        onClick={() => {
                                            setUseOriginalWriter(false);
                                            setSelectedWriter(writer);
                                        }}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${!useOriginalWriter && selectedWriter?.id === writer.id ? 'bg-blue-500/10 border-blue-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-semibold text-white">{writer.name}</div>
                                                <div className="text-sm text-zinc-400 mt-1">Skill: {writer.skill}/100</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-red-400 font-medium flex items-center justify-end gap-1">
                                                    {formatMoney(writer.fee)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg font-medium text-zinc-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={() => setStep('CONFIRM')}
                        disabled={!useOriginalWriter && !selectedWriter}
                        className="px-6 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <PenTool className="w-4 h-4" />
                        Start Writing
                    </button>
                </div>
            </div>
        </div>
    );
};
