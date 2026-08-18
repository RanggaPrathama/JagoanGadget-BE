import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { WarehouseService } from './warehouse.service';
import { WarehouseEntity } from '../entities/warehouse.entity';

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
  }) as unknown as jest.Mocked<Repository<WarehouseEntity>>;

describe('WarehouseService', () => {
  let service: WarehouseService;
  let repo: jest.Mocked<Repository<WarehouseEntity>>;

  beforeEach(() => {
    repo = mockRepo();
    service = new WarehouseService(repo);
  });

  it('create defaults isActive to true', async () => {
    const saved = {
      id: 'uuid-1',
      code: 'WH1',
      name: 'Main',
      address: null,
      isActive: true,
    } as WarehouseEntity;
    repo.create.mockReturnValue(saved);
    repo.save.mockResolvedValue(saved);
    const result = await service.create({ code: 'WH1', name: 'Main' } as any);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
    expect(result.isActive).toBe(true);
  });

  it('findOne throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing-uuid')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update toggles isActive', async () => {
    const existing = { id: 'uuid-1', isActive: true } as WarehouseEntity;
    repo.findOne.mockResolvedValue(existing);
    repo.save.mockResolvedValue({ ...existing, isActive: false });
    const result = await service.update('uuid-1', { isActive: false } as any);
    expect(result.isActive).toBe(false);
  });
});
