import { GearActions } from './GearActions'
import { GearFicha } from './GearFicha'
import { GearHeader } from './GearHeader'
import { buildGearModel } from './gearModel'
import { GearSatellites } from './GearSatellites'
import type { GearSceneProps } from './gearTypes'

export function GearScene({
  atom,
  atomIndex,
  onSatellite,
  onBack,
  onSubflow,
  onLoop,
}: GearSceneProps) {
  const model = buildGearModel(atom, atomIndex)

  return (
    <div className="gear-focus-stage" id="gear-focus-stage">
      <GearHeader atom={atom} eyebrow={model.eyebrow} />
      <GearSatellites
        side="left"
        label="Depende de"
        glyph="←"
        atoms={model.depends}
        onSatellite={onSatellite}
      />
      <GearSatellites
        side="right"
        label="Alimenta"
        glyph="→"
        atoms={model.unblocks}
        onSatellite={onSatellite}
      />
      <GearFicha fields={model.fields} />
      <GearActions atom={atom} onSubflow={onSubflow} onLoop={onLoop} onBack={onBack} />
    </div>
  )
}
