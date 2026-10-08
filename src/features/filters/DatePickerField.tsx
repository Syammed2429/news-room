import { format, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const API_DATE = 'yyyy-MM-dd'
const EARLIEST = new Date(2015, 0)
// fixed at page load so render stays pure
const TODAY = new Date()

interface Props {
  label: string
  value?: string // yyyy-MM-dd
  onChange: (value: string | undefined) => void
  // extra dates to block, future dates are always blocked
  disabled?: (date: Date) => boolean
}

// useId because this panel is mounted twice (sidebar and mobile sheet)
export const DatePickerField = ({ label, value, onChange, disabled }: Props) => {
  const id = useId()
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              className={cn('w-full justify-start px-2.5 font-normal', !selected && 'text-muted-foreground')}
            />
          }
        >
          <CalendarIcon aria-hidden />
          <span className="truncate">{selected ? format(selected, 'dd MMM yyyy') : 'Any date'}</span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            startMonth={EARLIEST}
            endMonth={TODAY}
            defaultMonth={selected ?? TODAY}
            selected={selected}
            disabled={(date) => date > TODAY || Boolean(disabled?.(date))}
            onSelect={(date) => {
              onChange(date ? format(date, API_DATE) : undefined)
              setOpen(false)
            }}
          />
          {selected && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  onChange(undefined)
                  setOpen(false)
                }}
              >
                Clear date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
