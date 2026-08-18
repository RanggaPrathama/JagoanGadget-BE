import { seedMenuCodes, seedPermissionCodes } from './seed.constants';

describe('RBAC seed constants', () => {
  it('includes brand/category/warehouse menus', () => {
    expect(seedMenuCodes).toEqual(
      expect.arrayContaining([
        'setup.brand',
        'setup.category',
        'setup.warehouse',
      ]),
    );
  });

  it('includes brand/category/warehouse permissions', () => {
    expect(seedPermissionCodes).toEqual(
      expect.arrayContaining([
        'brand.view',
        'brand.create',
        'brand.update',
        'brand.delete',
        'category.view',
        'category.create',
        'category.update',
        'category.delete',
        'warehouse.view',
        'warehouse.create',
        'warehouse.update',
        'warehouse.delete',
      ]),
    );
  });
});
