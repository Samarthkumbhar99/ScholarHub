import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StudentTabParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { toggleSaveScholarship } from '../../store/slices/scholarshipSlice';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
  EmptyState,
} from '../../components/common';
import {
  PrimaryButton,
  OutlineButton,
} from '../../components/buttons';
import {
  SearchInput,
} from '../../components/inputs';

type ScholarshipsNavProp = BottomTabNavigationProp<StudentTabParamList, 'Scholarships'>;

interface ScholarshipItem {
  id: string;
  title: string;
  provider: string;
  amount: string;
  deadline: string;
  category: 'merit' | 'stem' | 'abroad' | 'need';
  tags: string[];
  daysLeft: number;
}

const SAMPLE_SCHOLARSHIPS: ScholarshipItem[] = [
  {
    id: 'sch_01',
    title: 'Global Tech Innovators Fellowship',
    provider: 'National Science Foundation',
    amount: '$18,000 / year',
    deadline: '2026-10-15',
    category: 'stem',
    tags: ['Computer Science', 'GPA 3.5+', 'Undergrad'],
    daysLeft: 12,
  },
  {
    id: 'sch_02',
    title: 'Presidential Academic Excellence Grant',
    provider: 'Higher Education Ministry',
    amount: 'Full Tuition + Stipend',
    deadline: '2026-09-30',
    category: 'merit',
    tags: ['All Majors', 'Merit-Based', 'Final Year'],
    daysLeft: 4,
  },
  {
    id: 'sch_03',
    title: 'International Student Exchange Waiver',
    provider: 'Oxford Global Foundation',
    amount: '£12,500 One-time',
    deadline: '2026-11-01',
    category: 'abroad',
    tags: ['Study Abroad', 'Europe', 'Postgrad'],
    daysLeft: 28,
  },
  {
    id: 'sch_04',
    title: 'NextGen Women in Engineering Award',
    provider: 'Tech Pioneers Council',
    amount: '$10,000 / year',
    deadline: '2026-10-30',
    category: 'stem',
    tags: ['Engineering', 'Diversity', 'All Levels'],
    daysLeft: 20,
  },
];

export const ScholarshipsScreen: React.FC = () => {
  const navigation = useNavigation<ScholarshipsNavProp>();
  const dispatch = useAppDispatch();
  const { savedScholarshipIds } = useAppSelector((state) => state.scholarships);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { key: 'all', label: 'All Grants' },
    { key: 'stem', label: 'STEM' },
    { key: 'merit', label: 'Merit-Based' },
    { key: 'abroad', label: 'Study Abroad' },
    { key: 'need', label: 'Need-Based' },
  ];

  const filteredScholarships = SAMPLE_SCHOLARSHIPS.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* Header */}
      <Header
        title="Scholarships Directory"
        subtitle={`${filteredScholarships.length} opportunities available`}
      />

      {/* Search Input */}
      <SearchInput
        placeholder="Search by grant name, university, or major..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearable
      />

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4 -mx-4 px-4"
      >
        <View className="flex-row gap-2 py-1">
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setSelectedCategory(cat.key)}
              className={`px-3.5 py-1.5 rounded-xl border ${
                selectedCategory === cat.key
                  ? 'bg-primary-600 border-primary-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedCategory === cat.key ? 'text-white' : 'text-slate-700'
                }`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Scholarships List */}
      {filteredScholarships.length === 0 ? (
        <EmptyState
          title="No Scholarships Found"
          description="No grants match your current search query and filters."
          actionTitle="Clear Filters"
          onActionPress={() => {
            setSearchQuery('');
            setSelectedCategory('all');
          }}
        />
      ) : (
        <View className="gap-3.5 mb-6">
          {filteredScholarships.map((sch) => {
            const isSaved = savedScholarshipIds.includes(sch.id);
            return (
              <Card key={sch.id} variant="elevated" className="p-4">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-bold text-slate-900 leading-snug">
                      {sch.title}
                    </Text>
                    <Text className="text-xs text-slate-500 font-medium mt-0.5">
                      {sch.provider}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => dispatch(toggleSaveScholarship(sch.id))}
                    className={`h-9 w-9 rounded-xl items-center justify-center border ${
                      isSaved
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text className="text-base">{isSaved ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Amount & Deadline */}
                <View className="flex-row items-center justify-between py-2 border-y border-slate-100 mb-3">
                  <View>
                    <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Award Value
                    </Text>
                    <Text className="text-sm font-extrabold text-emerald-700">
                      {sch.amount}
                    </Text>
                  </View>
                  <Badge
                    variant={sch.daysLeft <= 7 ? 'warning' : 'info'}
                    size="sm"
                    showDot
                    label={`Closes in ${sch.daysLeft} days`}
                  />
                </View>

                {/* Tags */}
                <View className="flex-row flex-wrap gap-1.5 mb-3.5">
                  {sch.tags.map((tag) => (
                    <Badge key={tag} variant="neutral" size="sm" label={tag} />
                  ))}
                </View>

                {/* Actions */}
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <PrimaryButton
                      title="Apply Now"
                      size="sm"
                      onPress={() => navigation.navigate('Applications')}
                    />
                  </View>
                  <OutlineButton
                    title="Details"
                    size="sm"
                    onPress={() => {}}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
};

export default ScholarshipsScreen;
