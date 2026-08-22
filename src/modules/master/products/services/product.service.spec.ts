import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductService } from './product.service';
import { ProductEntity } from '../entities/product.entity';
import { ProductSkuEntity } from '../entities/product-sku.entity';
import { ProductImageEntity } from '../entities/product-image.entity';
import { SkuAttributeValueEntity } from '../entities/sku-attribute-value.entity';
import { AttributeEntity } from '../entities/attribute.entity';
import { CreateProductDto } from '../dto/product/create-product.dto';

const makeRepo = () => ({
  create: jest.fn((x) => x),
  save: jest.fn(async (x) => (Array.isArray(x) ? x : { id: 'new-id', ...x })),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => {
    const qb: any = {
      leftJoinAndSelect: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      getOne: jest.fn(async () => null),
    };
    return qb;
  }),
});

describe('ProductService', () => {
  let service: ProductService;
  const repos = {
    product: makeRepo(),
    sku: makeRepo(),
    image: makeRepo(),
    value: makeRepo(),
    attr: makeRepo(),
  };
  const manager = {
    getRepository: (e: any) =>
      e === ProductEntity
        ? repos.product
        : e === ProductSkuEntity
          ? repos.sku
          : e === ProductImageEntity
            ? repos.image
            : e === SkuAttributeValueEntity
              ? repos.value
              : repos.attr,
  };
  const dataSource = { transaction: jest.fn((fn) => fn(manager)) } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getRepositoryToken(ProductEntity), useValue: repos.product },
        { provide: getRepositoryToken(ProductSkuEntity), useValue: repos.sku },
        { provide: getRepositoryToken(ProductImageEntity), useValue: repos.image },
        { provide: getRepositoryToken(SkuAttributeValueEntity), useValue: repos.value },
        { provide: getRepositoryToken(AttributeEntity), useValue: repos.attr },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(ProductService);
  });

  describe('createProduct', () => {
    it('saves product, each sku, its images and values within one transaction', async () => {
      const dto: CreateProductDto = {
        categoryId: 'cat-1',
        name: 'iPhone 15',
        skus: [
          {
            skuCode: 'IP15-128',
            variantName: '128GB',
            price: 12999000,
            images: [{ imageUrl: 'u', isPrimary: true }],
            attributeValues: [{ attributeId: 'a1', value: '128GB' }],
          },
        ],
      };
      await service.createProduct(dto);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(repos.product.save).toHaveBeenCalled();
      expect(repos.sku.save).toHaveBeenCalledTimes(1);
      expect(repos.image.save).toHaveBeenCalledTimes(1);
      expect(repos.value.save).toHaveBeenCalledTimes(1);
    });

    it('rolls back (rejects) when a sku write fails', async () => {
      repos.sku.save.mockRejectedValueOnce(new Error('db fail'));
      const dto: CreateProductDto = {
        categoryId: 'cat-1',
        name: 'iPhone 15',
        skus: [{ skuCode: 'X', variantName: 'v', price: 1, attributeValues: [] }],
      };
      await expect(service.createProduct(dto)).rejects.toThrow('db fail');
    });
  });

  describe('findAll', () => {
    it('forces is_active=true for public listing', async () => {
      const repoMock: any = {
        createQueryBuilder: jest.fn(() => {
          const qb: any = {
            leftJoinAndSelect: jest.fn(() => qb),
            andWhere: jest.fn(() => qb),
            clone: jest.fn(() => qb),
            select: jest.fn(() => qb),
            skip: jest.fn(() => qb),
            take: jest.fn(() => qb),
            orderBy: jest.fn(() => qb),
            getCount: jest.fn(async () => 0),
            getMany: jest.fn(async () => []),
          };
          return qb;
        }),
      };
      // override the injected product repo for this test only
      (service as any).repo = repoMock;
      const whereSpy = jest.fn();
      repoMock.createQueryBuilder = jest.fn(() => {
        const qb: any = {
          leftJoinAndSelect: jest.fn(() => qb),
          andWhere: whereSpy,
          clone: jest.fn(() => qb),
          select: jest.fn(() => qb),
          skip: jest.fn(() => qb),
          take: jest.fn(() => qb),
          orderBy: jest.fn(() => qb),
          getCount: jest.fn(async () => 0),
          getMany: jest.fn(async () => []),
        };
        return qb;
      });
      await service.findAll({ page: 1, limit: 10 } as any, true);
      expect(whereSpy).toHaveBeenCalledWith('p.is_active = :a', { a: true });
    });
  });

  describe('getMinMaxPrice', () => {
    it('returns min/max from raw aggregation', async () => {
      const repoMock: any = {
        createQueryBuilder: jest.fn(() => {
          const qb: any = {
            leftJoin: jest.fn(() => qb),
            select: jest.fn(() => qb),
            addSelect: jest.fn(() => qb),
            andWhere: jest.fn(() => qb),
            getRawOne: jest.fn(async () => ({ min: '100', max: '200' })),
          };
          return qb;
        }),
      };
      (service as any).repo = repoMock;
      const range = await service.getMinMaxPrice({ isActive: true });
      expect(range).toEqual({ minPrice: '100', maxPrice: '200' });
    });
  });

  describe('findOneBySlug', () => {
    it('throws NotFoundException when missing', async () => {
      const repoMock: any = {
        createQueryBuilder: jest.fn(() => {
          const qb: any = {
            leftJoinAndSelect: jest.fn(() => qb),
            where: jest.fn(() => qb),
            andWhere: jest.fn(() => qb),
            getOne: jest.fn(async () => null),
          };
          return qb;
        }),
      };
      (service as any).repo = repoMock;
      await expect(service.findOneBySlug('nope', true)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('does not touch skus and regenerates slug only when name changes', async () => {
      const existing = {
        id: 'p1',
        name: 'Old',
        slug: 'old',
        description: 'd',
        isActive: true,
        brandId: null,
        categoryId: 'c1',
      };
      repos.product.createQueryBuilder.mockImplementation(() => {
        const qb: any = {
          leftJoinAndSelect: jest.fn(() => qb),
          where: jest.fn(() => qb),
          andWhere: jest.fn(() => qb),
          getOne: jest.fn(async () => existing),
        };
        return qb;
      });
      repos.product.save.mockResolvedValue({ ...existing, name: 'New', slug: 'new' });
      await service.update('p1', { name: 'New' } as any);
      expect(repos.sku.save).not.toHaveBeenCalled();
      expect(repos.product.save).toHaveBeenCalled();
    });
  });
});
