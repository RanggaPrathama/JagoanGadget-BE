import { MenuSeed, PermissionSeed } from './seed.service';

export const MENUS: MenuSeed[] = [
  {
    name: 'Dashboard',
    code: 'dashboard',
    route: '/admin',
    iconName: 'dashboard',
    type: 'menu',
    sortOrder: 1,
  },
  {
    name: 'Setup',
    code: 'setup',
    route: null,
    type: 'group',
    iconName: 'settings',
    sortOrder: 2,
  },
  {
    name: 'Menu',
    code: 'setup.menu',
    route: '/admin/setup/menu',
    iconName: null,
    sortOrder: 2,
    type: 'menu',
    parentCode: 'setup',
  },
  {
    name: 'Role',
    code: 'setup.role',
    route: '/admin/setup/role',
    iconName: null,
    sortOrder: 3,
    parentCode: 'setup',
    type: 'menu',
  },
  {
    name: 'Product',
    code: 'setup.product',
    route: '/admin/setup/product',
    iconName: null,
    sortOrder: 4,
    parentCode: 'setup',
    type: 'menu',
  },
  {
    name: 'Number Format',
    code: 'setup.number-format',
    route: '/admin/setup/number-format',
    iconName: null,
    sortOrder: 5,
    type: 'menu',
    parentCode: 'setup',
  },
  {
    name: 'Prefix',
    code: 'setup.prefix',
    route: '/admin/setup/prefix',
    iconName: null,
    sortOrder: 6,
    type: 'menu',
    parentCode: 'setup',
  },
  {
    name: 'User',
    code: 'user',
    route: '/admin/user',
    iconName: null,
    type: 'menu',
    sortOrder: 3,
  },
  // --- master-data brand/category/warehouse (added by plan) ---
  {
    name: 'Brand',
    code: 'setup.brand',
    route: '/admin/setup/brand',
    iconName: null,
    sortOrder: 7,
    type: 'menu',
    parentCode: 'setup',
  },
  {
    name: 'Category',
    code: 'setup.category',
    route: '/admin/setup/category',
    iconName: null,
    sortOrder: 8,
    type: 'menu',
    parentCode: 'setup',
  },
  {
    name: 'Warehouse',
    code: 'setup.warehouse',
    route: '/admin/setup/warehouse',
    iconName: null,
    sortOrder: 9,
    type: 'menu',
    parentCode: 'setup',
  },
];

export const PERMISSIONS: PermissionSeed[] = [
  {
    name: 'View Dashboard',
    code: 'dashboard.view',
    description: 'View dashboard',
    menuCode: 'dashboard',
  },
  // User
  {
    name: 'View Users',
    code: 'user.view',
    description: 'View user list',
    menuCode: 'user',
  },
  {
    name: 'Create User',
    code: 'user.create',
    description: 'Create new user',
    menuCode: 'user',
  },
  {
    name: 'Update User',
    code: 'user.update',
    description: 'Update user',
    menuCode: 'user',
  },
  {
    name: 'Delete User',
    code: 'user.delete',
    description: 'Delete user',
    menuCode: 'user',
  },

  // Menu
  {
    name: 'View Menus',
    code: 'menu.view',
    description: 'View menu list',
    menuCode: 'setup.menu',
  },
  {
    name: 'Create Menu',
    code: 'menu.create',
    description: 'Create new menu',
    menuCode: 'setup.menu',
  },
  {
    name: 'Update Menu',
    code: 'menu.update',
    description: 'Update menu',
    menuCode: 'setup.menu',
  },
  {
    name: 'Delete Menu',
    code: 'menu.delete',
    description: 'Delete menu',
    menuCode: 'setup.menu',
  },

  // Role
  {
    name: 'View Roles',
    code: 'role.view',
    description: 'View role list',
    menuCode: 'setup.role',
  },
  {
    name: 'Create Role',
    code: 'role.create',
    description: 'Create new role',
    menuCode: 'setup.role',
  },
  {
    name: 'Update Role',
    code: 'role.update',
    description: 'Update role',
    menuCode: 'setup.role',
  },
  {
    name: 'Delete Role',
    code: 'role.delete',
    description: 'Delete role',
    menuCode: 'setup.role',
  },
  {
    name: 'Assign Role Permissions',
    code: 'role.assign_permission',
    description: 'Assign permissions to role',
    menuCode: 'setup.role',
  },

  // Product
  {
    name: 'View Products',
    code: 'product.view',
    description: 'View product list',
    menuCode: 'setup.product',
  },
  {
    name: 'Create Product',
    code: 'product.create',
    description: 'Create new product',
    menuCode: 'setup.product',
  },
  {
    name: 'Update Product',
    code: 'product.update',
    description: 'Update product',
    menuCode: 'setup.product',
  },
  {
    name: 'Delete Product',
    code: 'product.delete',
    description: 'Delete product',
    menuCode: 'setup.product',
  },

  // Number Format
  {
    name: 'View Number Formats',
    code: 'number-format.view',
    description: 'View number format list',
    menuCode: 'setup.number-format',
  },
  {
    name: 'Create Number Format',
    code: 'number-format.create',
    description: 'Create new number format',
    menuCode: 'setup.number-format',
  },
  {
    name: 'Update Number Format',
    code: 'number-format.update',
    description: 'Update number format',
    menuCode: 'setup.number-format',
  },
  {
    name: 'Delete Number Format',
    code: 'number-format.delete',
    description: 'Delete number format',
    menuCode: 'setup.number-format',
  },

  // Prefix
  {
    name: 'View Prefixes',
    code: 'prefix.view',
    description: 'View prefix list',
    menuCode: 'setup.prefix',
  },
  {
    name: 'Create Prefix',
    code: 'prefix.create',
    description: 'Create new prefix',
    menuCode: 'setup.prefix',
  },
  {
    name: 'Update Prefix',
    code: 'prefix.update',
    description: 'Update prefix',
    menuCode: 'setup.prefix',
  },
  {
    name: 'Delete Prefix',
    code: 'prefix.delete',
    description: 'Delete prefix',
    menuCode: 'setup.prefix',
  },

  // Brand
  {
    name: 'View Brands',
    code: 'brand.view',
    description: 'View brand list',
    menuCode: 'setup.brand',
  },
  {
    name: 'Create Brand',
    code: 'brand.create',
    description: 'Create new brand',
    menuCode: 'setup.brand',
  },
  {
    name: 'Update Brand',
    code: 'brand.update',
    description: 'Update brand',
    menuCode: 'setup.brand',
  },
  {
    name: 'Delete Brand',
    code: 'brand.delete',
    description: 'Delete brand',
    menuCode: 'setup.brand',
  },

  // Category
  {
    name: 'View Categories',
    code: 'category.view',
    description: 'View category list',
    menuCode: 'setup.category',
  },
  {
    name: 'Create Category',
    code: 'category.create',
    description: 'Create new category',
    menuCode: 'setup.category',
  },
  {
    name: 'Update Category',
    code: 'category.update',
    description: 'Update category',
    menuCode: 'setup.category',
  },
  {
    name: 'Delete Category',
    code: 'category.delete',
    description: 'Delete category',
    menuCode: 'setup.category',
  },

  // Warehouse
  {
    name: 'View Warehouses',
    code: 'warehouse.view',
    description: 'View warehouse list',
    menuCode: 'setup.warehouse',
  },
  {
    name: 'Create Warehouse',
    code: 'warehouse.create',
    description: 'Create new warehouse',
    menuCode: 'setup.warehouse',
  },
  {
    name: 'Update Warehouse',
    code: 'warehouse.update',
    description: 'Update warehouse',
    menuCode: 'setup.warehouse',
  },
  {
    name: 'Delete Warehouse',
    code: 'warehouse.delete',
    description: 'Delete warehouse',
    menuCode: 'setup.warehouse',
  },
];

export const seedMenuCodes = MENUS.map((m) => m.code);
export const seedPermissionCodes = PERMISSIONS.map((p) => p.code);
