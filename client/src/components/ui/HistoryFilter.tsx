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
        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-1.5 rounded-xl flex items-center gap-1">
            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/10 mr-1 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-blue-200/70" />
                <span className="text-xs font-medium text-blue-200/70">{label}</span>
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-transparent text-xs font-medium text-white px-2 py-1 outline-none cursor-pointer"
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