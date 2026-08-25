import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NumberingService } from './numbering.service';
import { PrefixService } from './prefix.service';
import { NumberFormatEntity } from '../entities/number_format.entity';
import { NumberFormatSegmentEntity } from '../entities/number_format_d.entity';
import { PrefixEntity, TypePrefix } from '../entities/prefix.entity';
import { SegmentDto } from '../dto/number-format/segment.dto';

const NOW = new Date(2026, 7, 25); // 2026-08-25 local time

const makePrefix = (overrides: Partial<PrefixEntity> = {}): PrefixEntity =>
  ({
    id: 'p-seq',
    name: 'seq-inv',
    value: '0000',
    type: TypePrefix.SEQUENCE,
    isActive: true,
    ...overrides,
  }) as PrefixEntity;

const makeSegment = (
  index: number,
  prefix: PrefixEntity,
): NumberFormatSegmentEntity =>
  ({ id: `s-${index}`, index, prefixId: prefix.id, prefix }) as any;

const makeFormat = (
  segments: NumberFormatSegmentEntity[],
  isActive = true,
): NumberFormatEntity =>
  ({ id: 'nf-1', isActive, preview: '', segments }) as NumberFormatEntity;

const mockQb: any = {
  setLock: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
};

const createManager = () => {
  const prefixRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    save: jest.fn().mockImplementation(async (p: PrefixEntity) => p),
  };
  return {
    manager: {
      getRepository: jest.fn().mockReturnValue(prefixRepo),
      save: jest
        .fn()
        .mockImplementation(async (e: any) => (Array.isArray(e) ? e : e)),
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest
        .fn()
        .mockImplementation((_cls: any, data: any) => ({ ...data })),
    },
    prefixRepo,
  };
};

describe('buildPreview via service', () => {
  let service: NumberingService;

  const wire = (
    nf: NumberFormatEntity | null,
    prefixes: PrefixEntity[] = [],
  ) => {
    const nfRepo = {
      findOne: jest.fn().mockResolvedValue(nf),
      find: jest.fn().mockResolvedValue(prefixes),
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((d: any) => d),
      save: jest.fn().mockImplementation(async (e: any) => e),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<NumberFormatEntity>>;
    const prefixRepo = {
      find: jest.fn().mockResolvedValue(prefixes),
      count: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<Repository<PrefixEntity>>;
    const dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(async (fn: (m: any) => Promise<any>) =>
          fn(createManager().manager),
        ),
    } as any;
    service = new NumberingService(nfRepo, prefixRepo, dataSource);
  };

  it('renders sequence sample zero-padded without consuming', async () => {
    const seq = makePrefix();
    wire(makeFormat([makeSegment(0, seq)]));
    await expect(service.preview('nf-1')).resolves.toBe('0001');
  });

  it('rolls sequence width correctly: 0099 -> 0100', async () => {
    const seq = makePrefix({ value: '0099' });
    wire(makeFormat([makeSegment(0, seq)]));
    await expect(service.preview('nf-1')).resolves.toBe('0100');
  });

  it('renders YEAR/MONTH/DAY from current date', async () => {
    const year = makePrefix({
      id: 'p-year',
      type: TypePrefix.YEAR,
      value: '',
    });
    const month = makePrefix({
      id: 'p-month',
      type: TypePrefix.MONTH,
      value: '',
    });
    const day = makePrefix({ id: 'p-day', type: TypePrefix.DAY, value: '' });
    wire(
      makeFormat([
        makeSegment(2, day),
        makeSegment(0, year),
        makeSegment(1, month),
      ]),
    );
    await expect(service.preview('nf-1')).resolves.toBe(
      `${NOW.getFullYear()}08${NOW.getDate()}`,
    );
  });

  it('TEXT echoes value and mixed segments sort by index', async () => {
    const lit = makePrefix({
      id: 'p-lit',
      type: TypePrefix.TEXT,
      value: 'INV-',
    });
    const year = makePrefix({
      id: 'p-year',
      type: TypePrefix.YEAR,
      value: '',
    });
    const seq = makePrefix({ id: 'p-seq' });
    wire(
      makeFormat([
        makeSegment(2, seq),
        makeSegment(0, lit),
        makeSegment(1, year),
      ]),
    );
    await expect(service.preview('nf-1')).resolves.toBe(
      `INV-${NOW.getFullYear()}0001`,
    );
  });
});

describe('NumberingService.create/update', () => {
  const seg = (prefixId: string, index: number): SegmentDto => ({
    prefixId,
    index,
  });

  it('rejects duplicate segment indexes', async () => {
    const nfRepo = { findOne: jest.fn() } as any;
    const prefixRepo = { find: jest.fn() } as any;
    const dataSource = { transaction: jest.fn() } as any;
    const service = new NumberingService(nfRepo, prefixRepo, dataSource);
    await expect(
      service.create({
        menuId: null,
        segments: [seg('a', 0), seg('b', 0)],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('create wraps header + segments in one transaction and computes preview', async () => {
    const lit = makePrefix({ id: 'lit', type: TypePrefix.TEXT, value: 'INV-' });
    const seq = makePrefix({ id: 'seq' });
    const { manager } = createManager();

    const nfRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;
    const dataSource = {
      transaction: jest.fn().mockImplementation((fn: any) => fn(manager)),
    };

    const service = new NumberingService(
      nfRepo,
      { find: jest.fn().mockResolvedValue([lit, seq]) } as any,
      dataSource,
    );
    await service.create({
      menuId: null,
      isActive: true,
      segments: [seg(lit.id, 0), seg(seq.id, 1)],
    });

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalled();
    // header saved with recomputed preview at the end
    const lastSave = manager.save.mock.calls.at(-1)![0] as NumberFormatEntity;
    expect(lastSave.preview).toBe('INV-0001');
  });

  it('update replaces segments and recomputes preview in transaction', async () => {
    const oldLit = makePrefix({
      id: 'old-lit',
      type: TypePrefix.TEXT,
      value: 'OLD-',
    });
    const newLit = makePrefix({
      id: 'new-lit',
      type: TypePrefix.TEXT,
      value: 'NEW-',
    });
    const nf = makeFormat([makeSegment(0, oldLit)]);
    const { manager } = createManager();

    const nfRepo = { findOne: jest.fn().mockResolvedValue(nf) } as any;
    const dataSource = {
      transaction: jest.fn().mockImplementation((fn: any) => fn(manager)),
    };
    const service = new NumberingService(
      nfRepo,
      { find: jest.fn().mockResolvedValue([newLit]) } as any,
      dataSource,
    );

    const result = await service.update('nf-1', {
      segments: [{ prefixId: newLit.id, index: 0 }],
    });

    expect(manager.delete).toHaveBeenCalledWith(NumberFormatSegmentEntity, {
      numberFormatId: 'nf-1',
    });
    // single TEXT segment -> preview is its echoed value
    expect(result.preview).toBe('NEW-');
  });
});

describe('NumberingService.generate', () => {
  const setup = (
    format: NumberFormatEntity | null,
    prefixes: PrefixEntity[],
  ) => {
    const { manager, prefixRepo } = createManager();
    mockQb.getMany.mockReset();
    mockQb.getMany.mockResolvedValue(
      prefixes.filter((p) => p.type === TypePrefix.SEQUENCE),
    );

    const nfRepo = {
      findOne: jest.fn().mockResolvedValue(format),
    } as any;
    const dataSource = {
      transaction: jest.fn().mockImplementation((fn: any) => fn(manager)),
    };
    const service = new NumberingService(
      nfRepo,
      { find: jest.fn().mockResolvedValue(prefixes) } as any,
      dataSource,
    );
    return { service, manager, prefixRepo };
  };

  it('increments, pads, persists padded value, joins parts', async () => {
    const seq = makePrefix({ id: 'seq-a', value: '0999' });
    const lit = makePrefix({
      id: 'lit-a',
      type: TypePrefix.TEXT,
      value: 'INV-',
    });
    const year = makePrefix({ id: 'year-a', type: TypePrefix.YEAR, value: '' });
    const { service, manager } = setup(
      makeFormat([
        makeSegment(0, lit),
        makeSegment(1, year),
        makeSegment(2, seq),
      ]),
      [seq],
    );

    const res = await service.generateNext('nf-1');

    expect(res.number).toBe(`INV-${NOW.getFullYear()}1000`);
    // persisted value is the PADDED next (4-digit width kept)
    const prefixRepo = manager.getRepository(PrefixEntity);
    const saved = (prefixRepo.save as jest.Mock).mock
      .calls[0][0] as PrefixEntity;
    expect(saved.value).toBe('1000');
  });

  it('throws BadRequest when format is inactive', async () => {
    const seq = makePrefix();
    const { service } = setup(makeFormat([makeSegment(0, seq)], false), [seq]);
    await expect(service.generateNext('nf-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('locks sequence rows pessimistically in deterministic order', async () => {
    const a = makePrefix({ id: 'seq-a' });
    const b = makePrefix({ id: 'seq-b' });
    const { service, manager } = setup(
      makeFormat([makeSegment(0, b), makeSegment(1, a)]),
      [a, b],
    );
    mockQb.getMany.mockResolvedValue([a, b]);

    await service.generateNext('nf-1');

    expect(manager.getRepository).toHaveBeenCalledWith(PrefixEntity);
    expect(mockQb.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(mockQb.where).toHaveBeenCalledWith('p.id IN (:...ids)', {
      ids: ['seq-a', 'seq-b'],
    });
  });

  it('throws when a referenced prefix is inactive', async () => {
    const seq = makePrefix({ isActive: false });
    // locked row returns the inactive prefix; generation must refuse
    const { service } = setup(makeFormat([makeSegment(0, seq)]), []);
    mockQb.getMany.mockResolvedValue([seq]);
    await expect(service.generateNext('nf-1')).rejects.toThrow(/inactive/);
  });
});

describe('PrefixService.remove', () => {
  it('blocked while segments still reference the prefix', async () => {
    const prefixRepo = {
      findOne: jest.fn().mockResolvedValue(makePrefix()),
      remove: jest.fn(),
      count: jest.fn().mockResolvedValue(2),
    } as unknown as jest.Mocked<Repository<PrefixEntity>>;
    const segRepo = { count: jest.fn().mockResolvedValue(2) } as any;
    const service = new PrefixService(prefixRepo, segRepo);

    await expect(service.remove('p-seq')).rejects.toThrow(/masih dipakai/);
    expect(prefixRepo.remove).not.toHaveBeenCalled();
  });

  it('deletes when unused', async () => {
    const p = makePrefix();
    const prefixRepo = {
      findOne: jest.fn().mockResolvedValue(p),
      remove: jest.fn().mockResolvedValue(p),
      count: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<Repository<PrefixEntity>>;
    const segRepo = { count: jest.fn().mockResolvedValue(0) } as any;
    const service = new PrefixService(prefixRepo, segRepo);

    await service.remove('p-seq');
    expect(prefixRepo.remove).toHaveBeenCalledWith(p);
  });
});
