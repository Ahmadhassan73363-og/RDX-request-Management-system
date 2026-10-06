import { ShipmentStatus } from '../types/request';

export const SHIPMENT_FLOW: ShipmentStatus[] = ['approved', 'in_process', 'dispatched', 'delivered'];

export const SHIPMENT_STEP_LABELS: Record<ShipmentStatus, string> = {
  approved: 'Approved - Ready',
  in_process: 'In Process',
  dispatched: 'Dispatched',
  delivered: 'Delivered'
};

export const getShipmentStepIndex = (status?: ShipmentStatus): number => {
  const idx = SHIPMENT_FLOW.indexOf(status || 'approved');
  return idx === -1 ? 0 : idx;
};

export const getNextShipmentStatus = (current?: ShipmentStatus): ShipmentStatus | null => {
  const idx = getShipmentStepIndex(current);
  return idx >= SHIPMENT_FLOW.length - 1 ? null : SHIPMENT_FLOW[idx + 1];
};

// Label for the action that moves a shipment out of its current step, e.g.
// "Advance to Dispatched". Null once the shipment is delivered.
export const getAdvanceLabel = (current?: ShipmentStatus): string | null => {
  const next = getNextShipmentStatus(current);
  return next ? `Advance to ${SHIPMENT_STEP_LABELS[next]}` : null;
};

// Details the Shipment Manager must supply to enter a given step.
export const validateShipmentAdvance = (
  next: ShipmentStatus,
  details: { trackingIds: string[]; address: string }
): string | null => {
  if (next === 'dispatched' && details.trackingIds.filter(id => id.trim()).length === 0) {
    return 'At least one Courier Tracking ID is required before dispatching.';
  }
  if ((next === 'dispatched' || next === 'in_process') && !details.address.trim()) {
    return 'Shipping address is required.';
  }
  return null;
};
