import type { Settings } from 'http2';
import Switch from '../atoms/Switch';

type SettingRowProp = {
    label: string;
    value?: string;
    onChange?: () => void;
    children?: React.ReactNode;
};

function SettingRow({ label, value, onChange, children }: SettingRowProp) {
    return (
        <div className="flex items-center justify-between gap-4 my-2">
            <span className="text-sm font-medium">{label}</span>

            <div className="flex items-center gap-2">
                {children ?? <Switch checked={Boolean(value)} onCheckedChange={onChange} />}
            </div>
        </div>
    );
}

export default SettingRow;
