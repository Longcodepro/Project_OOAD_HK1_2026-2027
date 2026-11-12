import { useId, useMemo } from 'react'
import {
  starLayer,
  geoLayer,
  peopleLayer,
  deerLayer,
  birdLayer,
} from './dongsonData'

interface DongSonDrumProps {
  className?: string
  opacity?: number
  size?: number | string
  fixed?: boolean
}

export function DongSonDrum({
  className = '',
  opacity = 0.22,
  size = 1500,
  fixed = false,
}: DongSonDrumProps) {
  const compId = useId()

  const { star, geo, people, deer, birds } = useMemo(() => {
    return {
      star: starLayer(),
      geo: geoLayer(),
      people: peopleLayer(),
      deer: deerLayer(),
      birds: birdLayer(),
    }
  }, [])

  const drumContent = (
    <div
      className={`drum select-none text-bronze pointer-events-none ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        opacity,
      }}
      aria-hidden="true"
    >
      <svg
        key={`${compId}-star`}
        viewBox="-400 -400 800 800"
        className="ring l-star"
        dangerouslySetInnerHTML={{ __html: star }}
      />
      <svg
        key={`${compId}-geo`}
        viewBox="-400 -400 800 800"
        className="ring l-geo"
        dangerouslySetInnerHTML={{ __html: geo }}
      />
      <svg
        key={`${compId}-people`}
        viewBox="-400 -400 800 800"
        className="ring l-people"
        dangerouslySetInnerHTML={{ __html: people }}
      />
      <svg
        key={`${compId}-deer`}
        viewBox="-400 -400 800 800"
        className="ring l-deer"
        dangerouslySetInnerHTML={{ __html: deer }}
      />
      <svg
        key={`${compId}-birds`}
        viewBox="-400 -400 800 800"
        className="ring l-birds"
        dangerouslySetInnerHTML={{ __html: birds }}
      />
    </div>
  )

  if (fixed) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center"
      >
        <div className="translate-x-[15%] md:translate-x-[22%] translate-y-[5%]">
          {drumContent}
        </div>
      </div>
    )
  }

  return drumContent
}
