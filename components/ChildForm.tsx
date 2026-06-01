"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { childSchema, type Child, gradeValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type ChildFormValues = {
  name: string;
  grade: string;
  gender: string;
  score: number;
};

interface ChildFormProps {
  onSubmit: (data: Child) => void;
  defaultValues?: Partial<Child>;
  submitLabel?: string;
}

export function ChildForm({ onSubmit, defaultValues, submitLabel = "Submit" }: ChildFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<ChildFormValues>({
    defaultValues: {
      name: defaultValues?.name ?? "",
      grade: defaultValues?.grade ?? "",
      gender: defaultValues?.gender ?? "",
      score: defaultValues?.score ?? "",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name ?? "",
        grade: defaultValues.grade ?? "",
        gender: defaultValues.gender ?? "",
        score: defaultValues.score ?? "",
      });
    }
  }, [defaultValues, reset]);

  const handleFormSubmit = (data: ChildFormValues) => {
    const result = childSchema.safeParse(data);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        setError(field as keyof ChildFormValues, { message: issue.message });
      });
      return;
    }
    onSubmit(result.data);
  };

  const inputClass = (error?: string) =>
    cn("w-full", error && "border-destructive");

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input id="name" {...register("name")} className={inputClass(errors.name?.message)} placeholder="Student name" />
        {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="grade" className="text-sm font-medium">
          Grade
        </label>
        <select
          id="grade"
          {...register("grade")}
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            errors.grade && "border-destructive"
          )}
        >
          <option value="">Select...</option>
          {gradeValues.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        {errors.grade && <span className="text-xs text-destructive">{errors.grade.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="gender" className="text-sm font-medium">
          Gender
        </label>
        <select
          id="gender"
          {...register("gender")}
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            errors.gender && "border-destructive"
          )}
        >
          <option value="">Select...</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        {errors.gender && <span className="text-xs text-destructive">{errors.gender.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="score" className="text-sm font-medium">
          Score
        </label>
        <Input
          id="score"
          type="number"
          {...register("score")}
          className={inputClass(errors.score?.message)}
          placeholder="0"
          min={0}
        />
        {errors.score && <span className="text-xs text-destructive">{errors.score.message}</span>}
      </div>

      <Button type="submit" size="lg" className="mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}
