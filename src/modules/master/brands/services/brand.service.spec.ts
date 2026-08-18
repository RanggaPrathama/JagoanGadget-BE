import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BrandService } from './brand.service';
import { BrandEntity } from '../entities/brand.entity';
import { CreateBrandDto } from '../dto/brand/create-brand.dto';

const mockQb: any = {
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
};

const mockRepo = () =>
  ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
  }) as unknown as jest.Mocked<Repository<BrandEntity>>;

describe('BrandService', () => {
  let service: BrandService;
  let repo: jest.Mocked<Repository<BrandEntity>>;

  beforeEach(() => {
    repo = mockRepo();
    service = new BrandService(repo);
  });

  it('findAll returns items + total from query builder', async () => {
    const item = { id: 'uuid-1', name: 'Acme', logoUrl: null } as BrandEntity;
    mockQb.getManyAndCount.mockResolvedValue([[item], 1]);
    const result = await service.findAll({ page: 1, limit: 10 } as any);
    expect(result.items).toEqual([item]);
    expect(result.total).toBe(1);
  });

  it('findOne throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing-uuid')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('create persists a brand', async () => {
    const dto = { name: 'Acme', logoUrl: 'https://x/y.png' } as CreateBrandDto;
    const saved = { id: 'uuid-1', ...dto } as BrandEntity;
    repo.create.mockReturnValue(saved);
    repo.save.mockResolvedValue(saved);
    expect(await service.create(dto)).toEqual(saved);
  });

  it('remove deletes existing brand', async () => {
    const existing = { id: 'uuid-1', name: 'Acme' } as BrandEntity;
    repo.findOne.mockResolvedValue(existing);
    repo.remove.mockResolvedValue(existing);
    await expect(service.remove('uuid-1')).resolves.toBeUndefined();
    expect(repo.remove).toHaveBeenCalledWith(existing);
  });
});
