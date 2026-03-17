from django.db import models

class Student(models.Model):
    name = models.CharField(max_length=100)
    student_id = models.IntegerField()
    age = models.IntegerField()
    gender = models.CharField(max_length=100)
    course = models.CharField(max_length=100)
    ylevel = models.IntegerField()

    def __str__(self):
        return self.name


class Subjects(models.Model):
    code = models.IntegerField()
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=100)
    numUnit = models.CharField(max_length=100)
    course = models.CharField(max_length=100)
    ylevel = models.IntegerField()

    def __str__(self):
        return self.title