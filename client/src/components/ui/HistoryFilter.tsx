import { Calendar } from "lucide-react";

type Option = {
    value: string;
    label: string;
};

type Props = {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    label?: string;
};

const HistoryFilter = ({ value, onChange, options, label = "History" }: Props) => {
    return (
        <div className="bg-slate-900/50 border border-slate-800 p-1.5 rounded-xl flex items-center gap-1">
            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-800 mr-1 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase tracking-wider text-white px-2 py-1 outline-none cursor-pointer"
            >
                {options.map((opt, idx) => (
                    <option key={`${opt.value}-${idx}`} value={opt.value} className="bg-slate-900">
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default HistoryFilter;