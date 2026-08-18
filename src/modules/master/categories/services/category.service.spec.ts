import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoryService } from './category.service';
import { CategoryEntity } from '../entities/category.entity';

const mockRepo = () =>
  ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
  }) as unknown as jest.Mocked<Repository<CategoryEntity>>;

describe('CategoryService', () => {
  let service: CategoryService;
  let repo: jest.Mocked<Repository<CategoryEntity>>;

  beforeEach(() => {
    repo = mockRepo();
    service = new CategoryService(repo);
  });

  it('create generates slug from name when slug omitted', async () => {
    const saved = {
      id: 'uuid-1',
      name: 'Smart Phone',
      slug: 'smart-phone',
      parentId: null,
    } as CategoryEntity;
    repo.create.mockReturnValue(saved);
    repo.save.mockResolvedValue(saved);
    const result = await service.create({ name: 'Smart Phone' } as any);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'smart-phone' }),
    );
    expect(result.slug).toBe('smart-phone');
  });

  it('findTree nests children under parents', async () => {
    const rows = [
      {
        id: 'uuid-1',
        name: 'Electronics',
        slug: 'electronics',
        parentId: null,
      },
      { id: 'uuid-2', name: 'Phone', slug: 'phone', parentId: 'uuid-1' },
    ] as CategoryEntity[];
    repo.find.mockResolvedValue(rows);
    const tree = await service.findTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('uuid-2');
  });

  it('remove throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.remove('missing-uuid')).rejects.toThrow(
      NotFoundException,
    );
  });
});
