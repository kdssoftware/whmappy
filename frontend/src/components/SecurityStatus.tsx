// frontend/src/components/SecurityStatus.tsx
import { getSolarSystem } from "../mapSolarSystems";
import { getHexFromSecurityStatus } from "../utils";

export function SecurityStatus({ systemId }: { systemId: number }) {
  const systemInfo = getSolarSystem(systemId);
  return (
    <span
      style={{
        color: getHexFromSecurityStatus(systemInfo?.securityStatus ?? 0),
      }}
    >
      {systemInfo?.securityStatus.toFixed(1)}
    </span>
  );
}
