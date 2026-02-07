"use client"

import * as React from "react"
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Calendar as CalendarIcon, ChevronRight } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  className?: string
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [preset, setPreset] = React.useState<'all' | 'week' | 'month' | '3months' | 'custom' | null>(null)
  const [showCalendar, setShowCalendar] = React.useState(false)

  // Reset calendar view when opening
  React.useEffect(() => {
    if (isOpen) {
        // If we have a preset, hide calendar initially unless it's custom
        // Actually, let's keep previous state or default to hidden?
        // Let's default to hidden if a preset is active, or show if custom.
        if (preset === 'custom') setShowCalendar(true)
        else setShowCalendar(false)
    }
  }, [isOpen])

  const selectAllDates = () => {
    setDate(undefined)
    setPreset('all')
    setShowCalendar(false)
  }

  const selectThisWeek = () => {
    const today = new Date()
    const from = startOfWeek(today)
    const to = endOfWeek(today)
    setDate({ from, to })
    setPreset('week')
    setShowCalendar(false)
  }

  const selectThisMonth = () => {
    const today = new Date()
    const from = startOfMonth(today)
    const to = endOfMonth(today)
    setDate({ from, to })
    setPreset('month')
    setShowCalendar(false)
  }

  const selectPast3Months = () => {
    const today = new Date()
    const from = subMonths(today, 3)
    const to = today
    setDate({ from, to })
    setPreset('3months')
    setShowCalendar(false)
  }

  const handleCustomSelect = (newDate: DateRange | undefined) => {
    setDate(newDate)
    setPreset('custom')
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-fit justify-start text-left font-normal bg-white",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="font-semibold mr-2">
                {preset === 'all' ? 'All Dates' :
                 preset === 'week' ? 'This Week: ' : 
                 preset === 'month' ? 'Within this month: ' :
                 preset === '3months' ? 'Within past 3 months: ' : 
                 'Select Date: '}
            </span>
            {preset === 'all' ? (
              <span>-</span>
            ) : date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MM/dd/yyyy (EEE)")} -{" "}
                  {format(date.to, "MM/dd/yyyy (EEE)")}
                </>
              ) : (
                format(date.from, "MM/dd/yyyy (EEE)")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Sidebar */}
            <div className="flex flex-col gap-1 p-3 border-r w-[180px]">
              <Button 
                variant="ghost" 
                className={cn(
                    "justify-start font-normal h-9 px-3 text-sm",
                    preset === 'all' && "text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700"
                )} 
                onClick={selectAllDates}
              >
                All Dates
              </Button>
              <Button 
                variant="ghost" 
                className={cn(
                    "justify-start font-normal h-9 px-3 text-sm",
                    preset === 'week' && "text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700"
                )} 
                onClick={selectThisWeek}
              >
                This Week
              </Button>
              <Button 
                variant="ghost" 
                className={cn(
                    "justify-start font-normal h-9 px-3 text-sm",
                    preset === 'month' && "text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700"
                )} 
                onClick={selectThisMonth}
              >
                Within this month
              </Button>
              <Button 
                variant="ghost" 
                className={cn(
                    "justify-start font-normal h-9 px-3 text-sm",
                    preset === '3months' && "text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700"
                )} 
                onClick={selectPast3Months}
              >
                Within past 3 months
              </Button>
              <div className="my-2 border-t" />
              <Button
                variant="ghost"
                className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm font-medium h-9 hover:bg-orange-50 hover:text-orange-700 w-full",
                    (showCalendar || preset === 'custom') ? "text-orange-600" : "text-muted-foreground"
                )}
                onClick={() => {
                    setShowCalendar(true)
                    setPreset('custom')
                }}
              >
                Select Date
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar */}
            {showCalendar && (
                <div className="p-0 animate-in fade-in zoom-in-95 duration-200">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={handleCustomSelect}
                    numberOfMonths={2}
                />
                </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
