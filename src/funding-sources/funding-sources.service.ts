import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFundingSourceDto } from './dto/create-funding-source.dto';

@Injectable()
export class FundingSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFundingSourceDto) {
    return this.prisma.fundingSource.create({
      data: {
        type: dto.type,
        name: dto.name,
        lastFour: dto.lastFour,
        bankName: dto.bankName,
        brand: dto.brand,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.fundingSource.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(userId: string, fundingSourceId: string) {
    const fundingSource = await this.prisma.fundingSource.findFirst({
      where: {
        id: fundingSourceId,
        userId,
      },
    });

    if (!fundingSource) {
      throw new NotFoundException('Funding source not found');
    }

    return fundingSource;
  }

  async remove(userId: string, fundingSourceId: string) {
    const fundingSource = await this.findOne(userId, fundingSourceId);

    const transactionCount = await this.prisma.transaction.count({
      where: {
        fundingSourceId: fundingSource.id,
      },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        'This funding source cannot be removed because it is linked to transaction history',
      );
    }

    await this.prisma.fundingSource.delete({
      where: {
        id: fundingSource.id,
      },
    });

    return {
      message: 'Funding source removed successfully',
    };
  }
}
