import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';

export const RequirePermission = (permissionCode: string) => {
  //  console.log(`Setting required permission: ${permissionCode}`);
  return SetMetadata(PERMISSION_KEY, permissionCode);
};
