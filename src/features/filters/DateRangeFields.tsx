import { parseISO } from 'date-fns'
import { DatePickerField } from './DatePickerField'

interface Props {
  from?: string
  to?: string
  onFromChange: (value: string | undefined) => void
  onToChange: (value: string | undefined) => void
}

export const DateRangeFields = ({ from, to, onFromChange, onToChange }: Props) => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
      <DatePickerField
        label="From"
        value={from}
        onChange={onFromChange}
        disabled={to ? (date) => date > parseISO(to) : undefined}
      />
      <DatePickerField
        label="To"
        value={to}
        onChange={onToChange}
        disabled={from ? (date) => date < parseISO(from) : undefined}
      />
    </div>
  )
}
